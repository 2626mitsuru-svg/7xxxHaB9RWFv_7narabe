import { GameState, Player, Card, Suit } from "../../types/game";

export type StrategicContext = {
  self: Player;
  opponents: Player[];
  laneEnds: Record<Suit, { low: number; high: number }>;
  legalMoves: any[];
  remainingPasses: number;
  turnDistanceToThreat: number;
};

export function buildStrategicContext(state: GameState, self: Player): StrategicContext {
  const opponents = state.players.filter(p => p.id !== self.id && !p.isEliminated && !p.isFinished);
  const laneEnds = getLaneEnds(state);
  const { getLegalMoves } = require("../gameLogic");
  const legalMoves = getLegalMoves(state, self.id) || [];
  const maxPass = state.options?.maxPass ?? 3;
  const remainingPasses = Math.max(0, maxPass - (self.passCount ?? 0));

  // 最も手札が少ない相手まで自分からの手番距離（円環距離）
  const threat = opponents.reduce((a,b)=> (a.handCount??99) <= (b.handCount??99) ? a : b, opponents[0]);
  const turnDistanceToThreat = threat ? computeTurnDistance(state, self.id, threat.id) : 4;

  return { self, opponents, laneEnds, legalMoves, remainingPasses, turnDistanceToThreat };
}

// Lane ends calculation
function getLaneEnds(state: GameState): Record<Suit, { low: number; high: number }> {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  const laneEnds: Record<Suit, { low: number; high: number }> = {} as any;
  
  for (const suit of suits) {
    const row = state.board[suit];
    let low = 6, high = 6; // Start from 7 (index 6)
    
    // Find leftmost card (low end)
    for (let i = 5; i >= 0; i--) {
      if (row[i] !== null && row[i] !== 'GAP') {
        low = i;
      } else break;
    }
    
    // Find rightmost card (high end)  
    for (let i = 7; i <= 12; i++) {
      if (row[i] !== null && row[i] !== 'GAP') {
        high = i;
      } else break;
    }
    
    laneEnds[suit] = { low, high };
  }
  
  return laneEnds;
}

// --- Feature calculation functions ---

/** 相手脅威スコア：手札枚数が少ないほど↑、手番距離が近いほど↑ */
export function featOpponentThreat(ctx: StrategicContext): number {
  const minHand = Math.min(...ctx.opponents.map(o => o.handCount ?? 99));
  const base = Math.max(0, 3 - Math.min(minHand, 3)); // hand 0→3,1→2,2→1,>=3→0
  const distFactor = Math.max(0.5, 1.5 - 0.25 * ctx.turnDistanceToThreat); // 0→1.5, 2→1.0, 4→0.5
  return base * distFactor; // 0〜4.5 目安
}

/** レーン圧スコア：未出の"端隣接カード"を誰かが持っていそうな確率合計（簡易推定） */
export function featLanePressure(ctx: StrategicContext, state: GameState): number {
  let score = 0;
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  
  for (const suit of suits) {
    const ends = ctx.laneEnds[suit];
    const candidates = getUnseenNeighbors(state, suit, ends);
    const pAnyOpponentHas = approxSomeoneHas(state, ctx.self.id, candidates);
    score += pAnyOpponentHas;
  }
  return score; // 0〜4 程度（スート4つ）
}

/** ブロック保持価値：自分が出すと他者の合法手が増える（=今は出さない価値が高い） */
export function featBlockLeverage(state: GameState, ctx: StrategicContext): number {
  const approxRelease = estimateReleaseByMyBestMove(state, ctx.self, ctx.legalMoves);
  return Math.max(0, approxRelease); // 0〜複数
}

/** 自分の安全性：パスすると DOOMED/警戒に近づくほどマイナス（=パスにコスト） */
export function featSelfSafety(state: GameState, ctx: StrategicContext): number {
  const myLegalAfterPass = estimateMyLegalAfterN(state, ctx.self, 1);
  const risk = myLegalAfterPass === 0 ? 1.0 : myLegalAfterPass <= 1 ? 0.5 : 0.0;
  return 1 - risk; // 1=安全, 0=危険
}

/** 手札形状：端カード(A/K)・7近傍(6/8)の保持数で"温存価値"を評価 */
export function featHandShape(self: Player): number {
  const keys = self.hand?.filter(c => c.rank===1||c.rank===13||c.rank===6||c.rank===8)?.length ?? 0;
  return Math.min(1.5, keys * 0.4); // 0〜1.5
}

/** パス資源コスト（残パス少ないほど大） */
export function featPassResourceCost(ctx: StrategicContext): number {
  return ctx.remainingPasses >= 3 ? 0.0
       : ctx.remainingPasses === 2 ? 0.3
       : ctx.remainingPasses === 1 ? 0.7
       : 1.2; // 0〜1.2
}

// --- Utility functions ---

function computeTurnDistance(state: GameState, fromId: string, toId: string): number {
  const players = state.players.filter(p => !p.isEliminated && !p.isFinished);
  const fromIndex = players.findIndex(p => p.id === fromId);
  const toIndex = players.findIndex(p => p.id === toId);
  
  if (fromIndex === -1 || toIndex === -1) return 4;
  
  const forward = (toIndex - fromIndex + players.length) % players.length;
  return forward;
}

function getUnseenNeighbors(state: GameState, suit: Suit, ends: { low: number; high: number }): number[] {
  const candidates: number[] = [];
  const row = state.board[suit];
  
  // Check low end neighbor (with AK link)
  const lowNeighbor = ends.low - 1 >= 0 ? ends.low - 1 : 12; // A-K link
  if (row[lowNeighbor] === null) {
    candidates.push(lowNeighbor + 1); // Convert back to rank (1-13)
  }
  
  // Check high end neighbor (with AK link)
  const highNeighbor = ends.high + 1 <= 12 ? ends.high + 1 : 0; // K-A link
  if (row[highNeighbor] === null) {
    candidates.push(highNeighbor + 1); // Convert back to rank (1-13)
  }
  
  return candidates;
}

function approxSomeoneHas(state: GameState, selfId: string, candidates: number[]): number {
  if (candidates.length === 0) return 0;
  
  // Simple approximation: 30% chance someone has each candidate card
  const baseProb = Math.min(1, candidates.length * 0.3);
  return baseProb;
}

function estimateReleaseByMyBestMove(state: GameState, self: Player, legalMoves: any[]): number {
  if (legalMoves.length === 0) return 0;
  
  // Approximate: playing any card might open up 1-2 new possibilities for opponents
  const avgRelease = legalMoves.length > 0 ? 1.2 : 0;
  return avgRelease;
}

function estimateMyLegalAfterN(state: GameState, self: Player, nTurns: number): number {
  // Simple approximation: assume we'll have 2-3 legal moves after n turns
  // This would need more sophisticated analysis in a real implementation
  const { getLegalMoves } = require("../gameLogic");
  const currentLegal = getLegalMoves(state, self.id)?.length ?? 0;
  return Math.max(0, currentLegal - nTurns * 0.5);
}