export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K';

export interface Card {
  id: string;  // "S-7" など
  suit: Suit;
  rank: Rank;
}

export type Expression =
  | 'neutral' | 'happy' | 'surprised' | 'confident'
  | 'thinking' | 'nervous' | 'disappointed';

export const pad2 = (n: string | number) => String(n).padStart(2, '0');

/**
 * 画像URLを構築する。
 * - VITE_IMAGE_BASE があれば:  <BASE>/<01..11>/<expression>.(png|webp)
 * - なければ: ダミーURL（今は placehold.co を利用）
 *
 * 後日 Vercel に配置したら、.env に VITE_IMAGE_BASE を設定するだけで切替。
 */
export const buildExpressionUrl = (id: string | number, exp: Expression): string => {
  const base = (import.meta as any).env?.VITE_IMAGE_BASE?.trim();
  if (base) {
    // 例: https://your-app.vercel.app/images/01/neutral.png
    return `${base}/${pad2(id)}/${exp}.png`;
  }
  // ダミー（プレースホルダ）: 後日 .env を埋めれば自動で切替
  // （サイズや背景は自由に変更可）
  const label = encodeURIComponent(`${pad2(id)}-${exp}`);
  return `https://placehold.co/160x160/2d3748/ffffff?text=${label}`;
};

export type Seat = 'LU' | 'RU' | 'RD' | 'LD'; // LeftUp/RightUp/RightDown/LeftDown

export interface PlayerViewModel {
  id: string;
  name: string;
  seat: Seat;
  isHuman: boolean;
  handCount: number;
  hand?: Card[];           // isHuman の場合のみ表札表示（任意）
  expression: Expression;
  expressionImageUrl: string; // 外部URL（CORS許可前提）
  bubbleText?: string;
  accentColor?: string;    // カード背面・枠色など
  isTurn?: boolean;
}

export interface SevensBoardModel {
  // 置かれたカードの状態 true=出済
  placed: Record<Suit, Partial<Record<Rank, boolean>>>;
  // UI判断用（ロジックは外部）：そのセルに置けるなら true
  canPlace?: (s: Suit, r: Rank) => boolean;
}

// 既存システムとの連携用の変換ヘルパー
export const convertSuit = (oldSuit: '♠' | '♥' | '♦' | '♣'): Suit => {
  switch (oldSuit) {
    case '♠': return 'S';
    case '♥': return 'H';
    case '♦': return 'D';
    case '♣': return 'C';
  }
};

export const convertRank = (oldRank: number): Rank => {
  switch (oldRank) {
    case 1: return 'A';
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    default: return oldRank.toString() as Rank;
  }
};

export const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case 'S': return '♠';
    case 'H': return '♥';
    case 'D': return '♦';
    case 'C': return '♣';
  }
};

export const getSuitName = (suit: Suit): string => {
  switch (suit) {
    case 'S': return 'スペード';
    case 'H': return 'ハート';
    case 'D': return 'ダイヤ';
    case 'C': return 'クラブ';
  }
};