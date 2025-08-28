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

export type Seat = 'LU' | 'RU' | 'RD' | 'LD';

export interface PlayerViewModel {
  id: string;
  name: string;
  seat: Seat;
  isHuman: boolean;
  handCount: number;
  hand?: Card[];               // isHuman の場合のみ表札を表示
  expression: Expression;
  expressionImageUrl: string;  // 外部URL
  bubbleText?: string;
  accentColor?: string;        // バッジ/背面色
  isTurn?: boolean;            // 強調用
}

export interface SevensBoardModel {
  placed: Record<Suit, Partial<Record<Rank, boolean>>>;
  canPlace?: (s: Suit, r: Rank) => boolean; // UIの見せ方だけに使う
}

export interface GameInfoModel {
  turn: number;
  currentPlayer: string;
  phase: string;
}

// 画像URL構築関数
const IMAGE_BASE = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face';
export const buildExpressionUrl = (id: string | number, expr: string) => {
  // 実際の表情画像の代わりに、プレースホルダー画像を使用
  const placeholder = `https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face&auto=format&q=80&seed=${id}-${expr}`;
  return placeholder;
};