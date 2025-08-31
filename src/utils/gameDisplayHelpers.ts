import { getCPUColor } from './cpuColors';
import { PLAYER_POSITIONS } from '../constants/gameConstants';
import type { SyntheticEvent } from 'react';


// 利用可能な表情リスト（7種類）
export const AVAILABLE_EXPRESSIONS = [
  'confident',
  'happy', 
  'neutral',
  'thinking',
  'surprised',
  'nervous',
  'disappointed'
] as const;

export type ExpressionType = typeof AVAILABLE_EXPRESSIONS[number];

// 表情キー正規化（7種類の表情に対応）
export const normalizeExpressionKey = (k: string): string => {
  switch (k) {
    case 'normal': return 'neutral';
    case 'sad': return 'disappointed';
    case 'happy': return 'happy';
    case 'nervous': return 'nervous';
    case 'thinking': return 'thinking';
    case 'confident': return 'confident';
    case 'surprised': return 'surprised';
    case 'surpridsed': return 'surprised'; // CSVのスペルミス対応
    case 'disappointed': return 'disappointed';
    // 7種類の正式な表情
    case 'neutral': return 'neutral';
    default: return 'neutral'; // フォールバック
  }
};

// プレイヤーの表情画像URL生成（キャラクター色対応＋正規化＋検証）
export const getExpressionUrl = (playerId: string, expression: string = 'neutral') => {
  try {
    const cpuColor = getCPUColor(playerId);
    const cpuNumber = cpuColor.id.padStart(2, '0');
    let normalizedExpression = normalizeExpressionKey(expression);
    
    // 正規化後も無効な表情の場合は警告
    if (!AVAILABLE_EXPRESSIONS.includes(normalizedExpression as ExpressionType)) {
      console.warn(`Invalid expression after normalization: "${expression}" -> "${normalizedExpression}". Using neutral.`);
      normalizedExpression = 'neutral';
    }
    
    const url = `https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/${cpuNumber}/${normalizedExpression}.png`;
    
    console.debug('[face]', { playerId, expression, normalized: normalizedExpression, url });
    return url;
  } catch (error) {
    console.warn('Failed to generate expression URL:', error);
    // フォールバック：デフォルトの表情
    return `https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/01/neutral.png`;
  }
};

// プレイヤーカードの配置位置を決定
export const getPlayerPosition = (index: number): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' => {
  return PLAYER_POSITIONS[index] || 'top-left';
};

// 画像エラー時のフォールバック処理（無限ループ防止）
export const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const img = event.target as HTMLImageElement;
  
  // 既にフォールバック済みまたはneutralの場合は何もしない
  if (img.src.includes('neutral.png') || img.getAttribute('data-fallback-attempted') === 'true') {
    console.warn('Final fallback failed or already attempted:', img.src);
    return;
  }
  
  const playerId = img.getAttribute('data-player-id');
  if (playerId) {
    // フォールバック試行済みのマークを設定
    img.setAttribute('data-fallback-attempted', 'true');
    
    const fallbackUrl = getExpressionUrl(playerId, 'neutral');
    console.warn('Expression image failed, falling back to neutral:', { 
      original: img.src, 
      fallback: fallbackUrl 
    });
    img.src = fallbackUrl;
  }
};