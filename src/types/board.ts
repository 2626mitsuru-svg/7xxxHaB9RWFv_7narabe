// types/board.ts
import { Card } from './game';

// GAP定義（Symbolで統一して厳密比較とタイプミス防止）
export const GAP = Symbol('GAP');

// セル型定義
export type Cell = Card | null | typeof GAP;

// 空きセル判定の統一ヘルパー
export const isEmptyCell = (v: Cell): boolean => v === null || v === GAP;