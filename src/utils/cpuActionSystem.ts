import { GameState, Player, Move, LegalMove, Card } from '../types/game';
import { getLegalMoves } from './gameLogic';
import { evaluateMove, getPersonality, shouldMakeStrategicPass } from './cpuPersonalitySystem';

/**
 * CPU行動決定システム（パス抑制版）
 * - 基本原則：「出せるなら出す」
 * - パスは例外的な戦略行動のみ
 * - ゲーム進行の健全化
 */

export interface ActionDecision {
  action: 'play' | 'pass';
  move?: Move;
  reasoning?: string;
}

export class CPUActionSystem {
  /**
   * ★調整：メインの行動決定関数（パス大幅抑制）
   */
  static decideAction(state: GameState, playerId: string): ActionDecision {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { action: 'pass', reasoning: 'Player not found' };
    }

    const personality = getPersonality(playerId);
    const legalMoves = getLegalMoves(state, playerId);
    const validMoves = legalMoves.filter(move => move.type === 'place');

    console.debug(`[CPUActionSystem] ${playerId} has ${legalMoves.length} legal moves, ${validMoves.length} place moves`);
    console.debug(`[CPUActionSystem] Valid moves:`, validMoves.map(m => `${m.card?.suit}${m.card?.rank}`));

    // 出せる手がない場合は強制パス
    if (validMoves.length === 0) {
      console.debug(`[CPUActionSystem] ${playerId} has no valid moves, forced to pass`);
      return { action: 'pass', reasoning: 'No legal moves available' };
    }

    // ★大幅削減：性格によるパス判定（基本的には出す）
    // 気まぐれキャラの低確率パスのみ残す
    if (this.shouldPassByPersonalityMinimal(state, player, validMoves)) {
      return {
        action: 'pass',
        reasoning: `Minimal personality pass (${personality.passTendency.toFixed(2)})`
      };
    }

    // ★戦略的パス判定（性格システムから取得、厳格化済み）
    if (shouldMakeStrategicPass(state, player, validMoves)) {
      return {
        action: 'pass',
        reasoning: 'Strategic pass (very limited conditions)'
      };
    }

    // ★削除：リスク回避パス判定（基本的に出す原則）

    // 最適手を選択
    const bestMove = this.chooseBestMove(state, player, validMoves);
    
    if (bestMove) {
      return {
        action: 'play',
        move: bestMove,
        reasoning: 'Playing best move (default strategy)'
      };
    }

    // フォールバック: 最初の手を選択（パス回避）
    return {
      action: 'play',
      move: validMoves[0],
      reasoning: 'Playing first available move (fallback)'
    };
  }

  /**
   * ★新規：最小限の性格パス判定（大幅削減版）
   */
  private static shouldPassByPersonalityMinimal(state: GameState, player: Player, validMoves: Move[]): boolean {
    const personality = getPersonality(player.id);
    const maxPass = state.options.maxPass ?? 3;
    const remainingPasses = maxPass - player.passCount;

    // 残りパス0なら強制出し
    if (remainingPasses <= 0) return false;

    // ★基本パスしないキャラ（1,2,3,9）は絶対パスしない
    const noPassChars = ['cpu-01', 'cpu-02', 'cpu-03', 'cpu-09'];
    if (noPassChars.includes(player.id)) {
      return false;
    }

    // ★気まぐれキャラ（4,6）のみ低確率でパス
    const whimsicalChars = ['cpu-04', 'cpu-06'];
    if (whimsicalChars.includes(player.id)) {
      // 残りパス2回以上 & 5%の確率でのみ
      if (remainingPasses >= 2 && Math.random() < 0.05) {
        return true;
      }
    }

    // その他のキャラも基本的にパスしない
    return false;
  }

  /**
   * ★簡素化：最適手選択（性格フィルタリング軽減）
   */
  private static chooseBestMove(state: GameState, player: Player, validMoves: Move[]): Move | null {
    if (validMoves.length === 0) return null;

    const personality = getPersonality(player.id);
    
    // ★軽減：性格による手の事前フィルタリング（制限緩和）
    let filteredMoves = this.filterMovesByPersonalityLight(validMoves, state, player);
    
    // フィルタリング後に手がない場合は元の手を使用
    if (filteredMoves.length === 0) {
      filteredMoves = validMoves;
    }

    let bestMove = filteredMoves[0];
    let bestScore = -Infinity;

    for (const move of filteredMoves) {
      if (!move.card) continue;

      const gameContext = this.buildGameContext(state, player);

      const score = evaluateMove({
        card: move.card,
        suit: move.card.suit,
        position: 0,
        score: 0,
      }, player.hand, state.board, { game: gameContext, playerId: player.id });

      if (score > bestScore) {
        bestScore = score;
        bestMove = {
          type: move.type,
          playerId: move.playerId,
          card: move.card,
        };
      }
    }

    return bestMove;
  }

  /**
   * ★新規：軽量版性格フィルタリング（制限緩和）
   */
  private static filterMovesByPersonalityLight(validMoves: Move[], state: GameState, player: Player): Move[] {
    const personality = getPersonality(player.id);
    let filtered = [...validMoves];

    // ★手札抱え込み派：条件を厳格化（手札7枚以上かつ抱え込み度0.9以上の時のみ）
    if (personality.handHoarding > 0.9 && player.handCount >= 7) {
      const nonValuableMoves = filtered.filter(move => {
        if (!move.card) return true;
        return !this.isValuableCardForPlayer(move.card, player);
      });
      
      // 貴重でない手がある場合はそれを優先
      if (nonValuableMoves.length > 0) {
        filtered = nonValuableMoves;
      }
    }

    // ★リスク回避派：条件を厳格化（リスク回避度0.9以上かつ残りパス2以上の時のみ）
    if (personality.riskAverse > 0.9 && (state.options.maxPass ?? 3) - player.passCount >= 2) {
      const saferMoves = filtered.filter(move => 
        !this.isRiskyMoveForPlayer(move, state, player)
      );
      
      // 安全な手がある場合はそれを優先
      if (saferMoves.length > 0) {
        filtered = saferMoves;
      }
    }

    // ★ブロック傾向：条件は維持（いじわるらしさのため）
    if (personality.blockTendency > 0.7) {
      const blockingMoves = filtered.filter(move => 
        this.isBlockingMoveForPlayer(move, state)
      );
      
      // ブロック系の手がある場合はそれを優先
      if (blockingMoves.length > 0) {
        return blockingMoves.slice(0, Math.max(1, Math.ceil(blockingMoves.length * 0.8)));
      }
    }

    return filtered;
  }

  /**
   * プレイヤーにとってリスキーな手かどうか判定
   */
  private static isRiskyMoveForPlayer(move: Move, state: GameState, player: Player): boolean {
    if (!move.card) return false;

    const card = move.card;
    const position = card.rank - 1;

    // A, Kは常にリスキー
    if (position === 0 || position === 12) return true;

    // 同スートで最後の1枚はリスキー
    const sameSuitCount = player.hand.filter(c => c.suit === card.suit).length;
    if (sameSuitCount <= 1) return true;

    // 手札少ない時の貴重カードはリスキー
    if (player.handCount <= 4) {
      // 6, 8（7の隣）は貴重
      if (position === 5 || position === 7) return true;
    }

    return false;
  }

  /**
   * プレイヤーにとっての貴重カード判定
   */
  private static isValuableCardForPlayer(card: Card, player: Player): boolean {
    const position = card.rank - 1;

    // A, Kは常に貴重
    if (position === 0 || position === 12) return true;

    // 6, 8（7の隣）は貴重
    if (position === 5 || position === 7) return true;

    // 同スートで残り少ない場合は貴重
    const sameSuitCount = player.hand.filter(c => c.suit === card.suit).length;
    if (sameSuitCount <= 2) return true;

    return false;
  }

  /**
   * ブロック系の手判定
   */
  private static isBlockingMoveForPlayer(move: Move, state: GameState): boolean {
    if (!move.card) return false;

    const card = move.card;
    const position = card.rank - 1;

    // 端を開く手はブロック系
    if (position === 0 || position === 12) return true;

    // 6, 8はブロック効果が高い
    if (position === 5 || position === 7) return true;

    // 相手の手札が少ない時は全てブロック効果とみなす
    const opponents = state.players.filter(p => 
      p.id !== move.playerId && !p.isEliminated && !p.isFinished
    );
    const hasLowOpponent = opponents.some(opp => opp.handCount <= 3);
    
    return hasLowOpponent;
  }

  /**
   * ベストスコアの事前計算
   */
  private static peekBestScore(state: GameState, player: Player, validMoves: Move[]): number {
    if (validMoves.length === 0) return 0;

    let bestScore = -Infinity;
    for (const move of validMoves) {
      if (!move.card) continue;

      const gameContext = this.buildGameContext(state, player);
      
      const score = evaluateMove({
        card: move.card,
        suit: move.card.suit,
        position: 0,
        score: 0,
      }, player.hand, state.board, { game: gameContext, playerId: player.id });

      if (score > bestScore) {
        bestScore = score;
      }
    }

    return bestScore;
  }

  /**
   * ゲーム文脈情報の構築
   */
  private static buildGameContext(state: GameState, player: Player) {
    return {
      state,
      player,
      passCount: player.passCount,
      maxPass: state.options.maxPass ?? 3,
      handCount: player.hand.length,
      opponents: state.players.filter(p => p.id !== player.id && !p.isEliminated && !p.isFinished)
    };
  }

  /**
   * ★シンプル化：戦略的パス判定（基本false）
   */
  static shouldPass(state: GameState, player: Player): boolean {
    const maxPass = state.options.maxPass ?? 3;
    
    // 強制出し条件（残り0パス）
    if (player.passCount >= maxPass) {
      const legalMoves = getLegalMoves(state, player.id);
      return legalMoves.filter(m => m.type === 'place').length === 0;
    }

    // 基本的には出す
    return false;
  }
}