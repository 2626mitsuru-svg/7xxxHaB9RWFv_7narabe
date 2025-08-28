// 発言ヘルパー関数（レガシー関数 - 新しいspeakByPlayerIdを使用）
import { speakByPlayerId, type EventKey } from '../data/events';

/**
 * イベントキーとキャラクター名から発言を抽選する（レガシー関数）
 * @param eventKey イベントキー
 * @param character キャラクター名（例: "1主"）
 * @returns 発言文字列、または候補がない場合はnull
 */
export function speak(eventKey: string, character: string): string | null {
  // キャラクター名からplayerIdを逆変換（例: "1主" -> "cpu-1"）
  const match = character.match(/(\d+)主/);
  if (!match) return null;
  
  const num = parseInt(match[1]);
  const playerId = `cpu-${num}`;
  
  // EventKeyの正規化を試みる
  const normalizedKey = eventKey.toUpperCase().replace(/[^A-Z_]/g, '_') as EventKey;
  
  return speakByPlayerId(playerId, normalizedKey) || null;
}