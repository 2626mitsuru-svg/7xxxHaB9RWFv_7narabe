import { GameState, Player, BoardState, Card } from '../types/game';
import { PlayerViewModel, GameViewModel } from '../types/ui';
import { getCPUById } from '../data/cpuPlayers';
import { Character, PERSONALITIES } from './cpuPersonalitySystem';
import { speak } from './speech';

// 新しいSuit型から旧UI型への変換
function convertToUISuit(suit: '♠' | '♥' | '♦' | '♣'): 'S' | 'H' | 'D' | 'C' {
  switch (suit) {
    case '♠': return 'S';
    case '♥': return 'H';
    case '♦': return 'D';
    case '♣': return 'C';
  }
}

// キャラクターIDから個性システム対応IDへの変換
function getCharacterFromId(playerId: string): Character {
  const match = playerId.match(/cpu-(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    const characterMap: Record<number, Character> = {
      1: '1主（バランス型）',
      2: '2主（攻撃型）',
      3: '3主（守備型）',
      4: '4主（ランダム型）',
      5: '5主（計算型）',
      6: '6主（直感型）',
      7: '7主（堅実型）',
      8: '8主（博打型）',
      9: '9主（分析型）',
      10: '10主（熱血型）',
      11: '11主（天才型）'
    };
    if (num >= 1 && num <= 11) {
      return characterMap[num];
    }
  }
  return '1主（バランス型）'; // デフォルト
}

/**
 * ★修正版：直近アクションに応じて、Events の正式キーを返す
 */
function resolveEventKey(player: Player, gameState: GameState, playerIndex: number): string | null {
  const maxPass = gameState.options.maxPass ?? gameState.options.passLimit ?? 3;

  // 直近の行動がこのターンに発生したなら、その行動に応じたキー
  if (player.lastAction && player.lastActionTurn === gameState.turnId) {
    if (player.lastAction === 'play') return 'PLAY_NORMAL';
    if (player.lastAction === 'pass') {
      // パス警告チェック
      return player.passCount >= maxPass ? 'PASS_WARNING' : 'PASS_STRATEGIC';
    }
    if (player.lastAction === 'finish') return 'WINNER';
    if (player.lastAction === 'eliminate') return 'NO_LEGAL_MOVES_DETECTED';
  }

  // 手番開始時（現手番のみ）
  if (gameState.currentPlayerIndex === playerIndex && gameState.turnPhase === 'turn:awaitAction') {
    return 'TURN_START';
  }

  // 手札数による特殊状態
  if (player.hand.length === 1) {
    return 'HAND_COUNT_ONE';
  }
  if (player.hand.length === 2) {
    return 'HAND_COUNT_TWO';
  }

  // ゲーム開始時
  if (gameState.turn <= 2) {
    return 'DEALT_HAND_EVAL';
  }

  return null;
}

/**
 * ★修正版：個性システムベースのセリフ生成
 */
function generatePersonalitySpeech(
  player: Player, 
  gameState: GameState, 
  playerIndex: number
): string | undefined {
  const character = getCharacterFromId(player.id);
  const key = resolveEventKey(player, gameState, playerIndex);
  if (!key) return undefined;

  const line = speak(key, character);
  if (line) return line;

  // 最終フォールバック（極力出ない想定）
  return undefined;
}

// 既存のプレイヤーデータを新UIシステムのViewModelに変��
export function convertToPlayerViewModel(
  player: Player, 
  gameState: GameState, 
  playerIndex: number
): PlayerViewModel {
  // CPUデータから性格を取得
  const cpuData = getCPUById(player.id);
  const character = getCharacterFromId(player.id);
  const personality = PERSONALITIES[character];
  
  // 表情を状態から推測
  let expression = 'neutral';
  if (player.isEliminated) {
    expression = 'disappointed';
  } else if (player.isFinished) {
    expression = 'happy';
  } else if (gameState.currentPlayerIndex === playerIndex && !player.isEliminated) {
    expression = 'thinking';
  } else if (player.passCount >= (gameState.options.maxPass ?? gameState.options.passLimit ?? 3) - 1) {
    expression = 'nervous';
  } else if (player.hand.length <= 2) {
    expression = 'confident';
  } else if (player.lastAction === 'play') {
    expression = 'surprised';
  }

  // ★修正版：個性システムベースのセリフ生成（そのターンの行動にのみ反応）
  const speech = generatePersonalitySpeech(player, gameState, playerIndex);

  // アクセントカラー（個性に基づく色調整）
  const baseColors = [
    '#3b82f6', // ブルー
    '#ef4444', // レッド  
    '#10b981', // エメラルド
    '#f59e0b', // アンバー
    '#8b5cf6', // バイオレット
    '#ec4899', // ピンク
    '#06b6d4', // シアン
    '#84cc16', // ライム
    '#f97316', // オレンジ
    '#6366f1', // インディゴ
    '#14b8a6'  // ティール
  ];
  
  let colorIndex = parseInt(player.id.replace(/\D/g, '')) % baseColors.length;
  
  // 個性による色調整
  if (personality.strategicPass > 0.8) {
    colorIndex = 2; // 戦略的 = エメラルド
  } else if (personality.intuition > 0.9) {
    colorIndex = 4; // 直感的 = バイオレット
  } else if (personality.blockTendency > 0.6) {
    colorIndex = 1; // 攻撃的 = レッド
  }
  
  const accentColor = baseColors[colorIndex];

  return {
    id: player.id,
    name: player.name,
    handCount: player.hand.length,
    passCount: player.passCount,
    isEliminated: player.isEliminated,
    isFinished: player.isFinished,
    expression,
    speech, // ★個性システムからのセリフ（該当ターンのみ）
    accentColor,
    isTurn: gameState.currentPlayerIndex === playerIndex && !player.isEliminated
  };
}

// ゲーム状態全体を新UIシステム用のデータに変換
export function convertGameStateToUI(gameState: GameState): GameViewModel {
  // プレイヤーを4人に調整（不足分はダミー）
  const players: PlayerViewModel[] = [];
  
  for (let i = 0; i < 4; i++) {
    if (i < gameState.players.length) {
      players.push(convertToPlayerViewModel(gameState.players[i], gameState, i));
    } else {
      // ダミープレイヤー
      players.push({
        id: `dummy-${i}`,
        name: `CPU${i + 1}`,
        handCount: 0,
        passCount: 0,
        isEliminated: false,
        isFinished: false,
        expression: 'neutral',
        speech: '待機中...',
        accentColor: '#6b7280',
        isTurn: false
      });
    }
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  return {
    players,
    board: gameState.board,
    currentPlayer: currentPlayer?.name || 'N/A',
    phase: gameState.gamePhase === 'playing' ? '対戦中' : 
           gameState.gamePhase === 'finished' ? '終了' : '待機中',
    turn: gameState.turn
  };
}

// イベント通知用の関数（今後のゲームロジック統合用）
export function onGameEvent(eventKey: string, playerId: string, context?: any): string | null {
  const character = getCharacterFromId(playerId);
  return speak(eventKey, character);
}