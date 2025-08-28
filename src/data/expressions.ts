/**
 * CSV-based Expression System
 * セリフ発火と同様にCSVで表情を制御する仕組み
 */

import { EventKey } from './events';
import { Expression } from '../hooks/useExpressionController';

// 表情の優先度（数値が高いほど優先）
export const EXPRESSION_PRIORITY: Record<Expression, number> = {
  'disappointed': 100,  // 最優先（脱落・負け）
  'happy': 90,         // 高優先（勝利・成功）
  'surprised': 80,     // 中高優先（驚き・予想外）
  'nervous': 70,       // 中優先（ピンチ・不安）
  'confident': 60,     // 中優先（自信・余裕）
  'thinking': 50,      // 低優先（思考中）
  'neutral': 10,       // 最低優先（デフォルト）
};

// 表情の保持期間（ミリ秒）
export const EXPRESSION_DURATION = {
  DEFAULT: 2200,       // デフォルト保持時間
  THINKING_MIN: 600,   // thinking の最小時間
  THINKING_MAX: 1200,  // thinking の最大時間
  PERMANENT: -1,       // 永続表情（順位確定時）
};

/**
 * CSVの列名を正規化（タイポ補正）
 */
function normalizeColumnName(name: string): string {
  return name.toLowerCase()
    .replace(/[\s\-_]+/g, '_')
    .replace('surpridsed', 'surprised')  // タイポ補正
    .replace('dissapointed', 'disappointed'); // タイポ補正
}

/**
 * EventKeyを正規化（タイポ補正）
 */
function normalizeEventKey(key: string): string {
  return key.toUpperCase()
    .replace(/[\s\-]+/g, '_')
    .replace('OTHER_PASS_NOMAL', 'OTHER_PASS_NORMAL')  // タイポ補正
    .replace('SURPRIDSED', 'SURPRISED'); // タイポ補正
}

/**
 * CSVの1行を分割（カンマ区切り、クォート対応）
 */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // エスケープされたクォートをスキップ
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * CSVテキストをパースして表情マップを生成
 */
export function parseExpressionCSV(csvText: string): Record<string, Expression[]> {
  const lines = csvText.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length < 2) {
    console.warn('[ExpressionCSV] No data rows found, returning empty map');
    return {};
  }

  // ヘッダー行を解析
  const headerLine = lines[0];
  const headers = splitCSVLine(headerLine).map(normalizeColumnName);
  
  const eventKeyIndex = headers.findIndex(h => h === 'event_key' || h === 'event');
  if (eventKeyIndex === -1) {
    console.error('[ExpressionCSV] event_key column not found');
    return {};
  }

  // 表情カテゴリのインデックスを取得
  const expressionColumns: { [key: string]: number } = {};
  const validExpressions: Expression[] = ['confident', 'happy', 'neutral', 'thinking', 'surprised', 'nervous', 'disappointed'];
  
  validExpressions.forEach(expr => {
    const index = headers.indexOf(expr);
    if (index !== -1) {
      expressionColumns[expr] = index;
    }
  });

  console.debug('[ExpressionCSV] Found expression columns:', expressionColumns);

  const expressionMap: Record<string, Expression[]> = {};

  // データ行を処理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = splitCSVLine(line);
    
    if (columns.length <= eventKeyIndex) continue;

    const rawEventKey = columns[eventKeyIndex];
    const normalizedEventKey = normalizeEventKey(rawEventKey);
    
    // このイベントキーに対応する表情カテゴリを収集
    const availableExpressions: Expression[] = [];
    
    Object.entries(expressionColumns).forEach(([expression, columnIndex]) => {
      if (columnIndex < columns.length) {
        const value = columns[columnIndex].trim();
        // '1' または空でない値があれば候補に含める
        if (value === '1' || (value && value !== '0')) {
          availableExpressions.push(expression as Expression);
        }
      }
    });

    if (availableExpressions.length > 0) {
      expressionMap[normalizedEventKey] = availableExpressions;
      console.debug(`[ExpressionCSV] ${normalizedEventKey} -> [${availableExpressions.join(', ')}]`);
    }
  }

  console.debug(`[ExpressionCSV] Parsed ${Object.keys(expressionMap).length} event mappings`);
  return expressionMap;
}

/**
 * 指定されたイベントキーに対応する表情を等確率で選択
 */
export function pickExpressionForEvent(
  expressionMap: Record<string, Expression[]>,
  eventKey: EventKey
): Expression {
  const availableExpressions = expressionMap[eventKey];
  
  if (!availableExpressions || availableExpressions.length === 0) {
    console.debug(`[ExpressionPicker] No expressions defined for ${eventKey}, using neutral`);
    return 'neutral';
  }

  // 等確率でランダム選択
  const randomIndex = Math.floor(Math.random() * availableExpressions.length);
  const selectedExpression = availableExpressions[randomIndex];
  
  console.debug(`[ExpressionPicker] ${eventKey} -> ${selectedExpression} (from [${availableExpressions.join(', ')}])`);
  return selectedExpression;
}

/**
 * 表情の優先度比較（新しい表情が現在の表情を上書きできるかチェック）
 */
export function canOverrideExpression(
  currentExpression: Expression,
  newExpression: Expression,
  currentSetTime: number,
  minHoldTime: number = 1000
): boolean {
  const now = Date.now();
  
  // 最小保持時間内は上書き不可
  if (now - currentSetTime < minHoldTime) {
    return false;
  }

  // 優先度による判定
  const currentPriority = EXPRESSION_PRIORITY[currentExpression] || 0;
  const newPriority = EXPRESSION_PRIORITY[newExpression] || 0;
  
  return newPriority >= currentPriority;
}

/**
 * 表情の自然な保持時間を計算
 */
export function calculateExpressionDuration(expression: Expression): number {
  switch (expression) {
    case 'thinking':
      return EXPRESSION_DURATION.THINKING_MIN + 
             Math.random() * (EXPRESSION_DURATION.THINKING_MAX - EXPRESSION_DURATION.THINKING_MIN);
    case 'disappointed':
    case 'happy':
      // 感情的な表情は長めに保持
      return EXPRESSION_DURATION.DEFAULT + Math.random() * 800;
    case 'surprised':
      // 驚きは短めに
      return EXPRESSION_DURATION.DEFAULT * 0.7 + Math.random() * 400;
    default:
      return EXPRESSION_DURATION.DEFAULT + Math.random() * 400;
  }
}