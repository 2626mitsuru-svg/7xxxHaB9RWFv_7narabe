import { Suit, Rank } from "./sevens";

// ★Joker廃止：Card型をシンプル化（suit/rank必須）
export interface Card {
  suit: Suit; // 必須
  rank: Rank; // 必須
}

// カードメタデータ
export interface CardMeta {
  playedBy: string; // playerId ("cpu-3" 等)
  move: number; // ← 互換のため残す（global手数）
  dumped?: boolean; // ドボン展開で置かれたら true
  // 追加：個人手数
  playerMove?: number; // そのプレイヤーが何手目に出したか（1始まり）
}

// ★Joker廃止：統計から削除
export interface GameStats {
  // Joker関連統計は削除
  gamesPlayed?: number; // 将来用
  totalMoves?: number; // 将来用
}

// ★Joker廃止：リアクションイベント（Joker関連削除）
// 既存の定義に2行追加（others/self 用の DOOMED）
export type ReactionEvent =
  | {
      kind: "react:others:cardPlaced";
      by: string;
      card: Card;
      meta?: any;
    }
  | { kind: "react:others:pass"; by: string }
  | { kind: "react:others:passStreak"; count: number }
  | {
      kind: "react:others:blockReleased";
      suit: Suit;
      idx: number;
    }
  | { kind: "react:others:eliminated"; playerId: string }
  | { kind: "react:others:massPlacement"; loserId: string }
  | {
      kind: "react:self:finish";
      playerId: string;
      reason: "win" | "foul" | "passOver";
    }
  | {
      kind: "react:others:doomedDetected";
      by: string;
      meta?: { target: string };
    } // ★追加
  | { kind: "react:self:doomedDetected"; playerId: string }; // ★追加

// ★Joker廃止：UIFxQueueからJoker関連削除
export interface UIFxQueue {
  queue?: ReactionEvent[]; // 一般リアクションキューのみ
  finish?: ReactionEvent & { kind: "react:self:finish" }; // 終了時専用
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  handCount?: number;
  passCount: number;
  isEliminated: boolean;
  isFinished: boolean;
  lastAction?: "play" | "pass" | "eliminate" | "finish";
  lastActionTurn?: number;
  eliminateReason?: "passOver" | "foul"; // ★jokerOnly削除
  // 同ターン多重発話を抑止するフラグ
  _spokenFlags?: Record<
    number /*turnId*/,
    Record<string /*key*/, true>
  >;
}

import { GAP } from "./board";

export type BoardState = {
  [K in Suit]: (Card | typeof GAP | null)[];
};

// ★Joker廃止：GameOptionsからjokerMode削除
export interface GameOptions {
  maxPass?: number;
  eliminateOnFourthPass?: boolean;
  akLink?: boolean;
  enableAKLink?: boolean;
  passLimit?: number;
  // デバッグオプション
  debugFx?: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  board: BoardState;
  turnId: number;
  turn: number;
  gamePhase: "playing" | "finished";
  turnPhase: "turn:begin" | "turn:awaitAction" | "turn:advance";
  actionLock: boolean;
  options: GameOptions;
  rankings: string[];
  moveHistory: Move[];
  logs: string[];
  winner?: string;

  // カードメタデータ追跡
  cardMeta: Record<Suit, (CardMeta | null)[]>;
  nextMoveNo: number; // 初期 1（グローバル手数、互換維持）
  dealtDeck: Card[]; // 初期配札デッキ（保険用）

  // プレイヤーごとの手数カウンタ
  perPlayerMoves: Record<string, number>; // playerId → 次に採番する個人手数（初期 1）

  // 所有者インデックス（通常カードのみ）
  ownerIndex: Record<
    string /*key=suit+rank*/,
    string /*playerId*/
  >; // O(1)所有者探索

  // 合法手キャッシュ（GAP対応で盤面変更後の再計算用）
  legalMovesCache?: Record<string /*playerId*/, Move[]>;

  // ★Joker廃止：UIエフェクトキュー（シンプル化）
  uiFx?: UIFxQueue;

  // 診断統計
  stats?: GameStats;

  // パス連続カウント
  passStreak?: number;

  // 直近の行動詳細（Joker関連フラグ削除）
  lastPlaced?: {
    suit: Suit;
    rank: Rank;
    wasNewEnd?: boolean;
    extendedEnd?: boolean;
    unblockedSelf?: boolean;
    openedOppWait?: boolean;
    wasRunoutPush?: boolean;
    dumpedRisky?: boolean;
    completedAKtoA?: boolean;
    completedAKtoK?: boolean;
  };
}

// ★Joker廃止：Moveからtarget削除
export interface Move {
  type: "place" | "pass";
  playerId: string;
  card?: Card;
}

export interface LegalMove {
  card: Card;
  suit: Suit;
  position: number;
  score: number;
  // いじわるパス用評価フラグ
  opensNewEnd?: boolean; // 新端を開く手かどうか
  wouldReleaseMyBlock?: boolean; // 自分のブロックを解放する手かどうか
}

// ★Joker廃止：AITraitsからjokerAversion削除
export interface AITraits {
  aggressiveness: number;
  conservativeness: number;
  blocker: number;
  opener: number;
  passGreed: number;
  akPreference: number;
  // 戦略的パス関連
  strategicPass?: number; // 戦略的パスの傾向
  spitePass?: number; // いじわるパスの傾向
}

// ★変更：吹き出し表示用の型（並列表示対応）
export interface SpeechBubble {
  playerId: string;
  text: string;
  timestamp?: number; // 追加：表示時刻
  isProtected?: boolean; // ★追加：終了セリフ保護フラグ
}

// ★新規：複数プレイヤーの発話管理用
export interface PlayerSpeechState {
  [playerId: string]: SpeechBubble | null;
}