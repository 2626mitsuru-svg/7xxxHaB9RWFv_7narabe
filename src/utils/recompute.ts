import { GameState } from "../types/game";
import { getLegalMoves } from "./gameLogic";
import { GAP } from "../types/board";

/**
 * 全プレイヤーの合法手キャッシュを再計算する
 * ドボン展開や大量カード配置後に呼び出す
 */
export function recomputeAllLegalMoves(state: GameState): void {
  console.debug("[recomputeAllLegalMoves] Recomputing legal moves for all players");
  
  if (!state.players) {
    console.error("[recomputeAllLegalMoves] state.players is null or undefined");
    return;
  }

  // 現在の盤面をログ出力（GAP確認用）
  console.debug("[recomputeAllLegalMoves] Current board state:");
  for (const suit of ['♠', '♥', '♦', '♣'] as const) {
    const row = state.board[suit];
    const gapPositions = row.map((cell, idx) => cell === GAP ? idx : null).filter(idx => idx !== null);
    if (gapPositions.length > 0) {
      console.debug(`  ${suit}: GAP positions at indices ${gapPositions}`);
    }
  }

  // キャッシュが存在しない場合は初期化
  if (!state.legalMovesCache) {
    state.legalMovesCache = {};
  }

  for (const player of state.players) {
    if (player.isEliminated || player.isFinished) {
      // 脱落・完了したプレイヤーは空配列
      state.legalMovesCache[player.id] = [];
      console.debug(`[recomputeAllLegalMoves] ${player.id}: 0 legal moves (eliminated/finished)`);
    } else {
      // アクティブプレイヤーは最新の盤面で合法手を計算
      console.debug(`[recomputeAllLegalMoves] Computing legal moves for ${player.id} with hand:`, 
        player.hand.map(c => `${c.suit}${c.rank}`));
      
      const legalMoves = getLegalMoves(state, player.id);
      state.legalMovesCache[player.id] = legalMoves || [];
      
      console.debug(`[recomputeAllLegalMoves] ${player.id}: ${legalMoves?.length || 0} legal moves:`, 
        (legalMoves || []).map(m => `${m.card?.suit}${m.card?.rank}`));
    }
  }

  console.debug("[recomputeAllLegalMoves] Recomputation completed");
}

/**
 * 特定プレイヤーの合法手キャッシュを更新する
 */
export function recomputePlayerLegalMoves(state: GameState, playerId: string): void {
  console.debug(`[recomputePlayerLegalMoves] Recomputing legal moves for ${playerId}`);
  
  if (!state.players) {
    console.error("[recomputePlayerLegalMoves] state.players is null or undefined");
    return;
  }

  if (!state.legalMovesCache) {
    state.legalMovesCache = {};
  }

  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    console.error(`[recomputePlayerLegalMoves] Player ${playerId} not found`);
    return;
  }

  if (player.isEliminated || player.isFinished) {
    state.legalMovesCache[playerId] = [];
  } else {
    const legalMoves = getLegalMoves(state, playerId);
    state.legalMovesCache[playerId] = legalMoves || [];
    console.debug(`[recomputePlayerLegalMoves] ${playerId}: ${legalMoves?.length || 0} legal moves`);
  }
}