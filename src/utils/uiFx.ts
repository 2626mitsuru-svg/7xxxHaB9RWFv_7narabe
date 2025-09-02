// src/utils/uiFx.ts
import type { GameState } from "../types/game";

/** UIエフェクトイベントの最小型（あなたの実装に合わせて拡張OK） */
export type UiFxEvent =
  | { kind: "emoji"; playerId: string; emoji: string; ttlMs?: number; meta?: any }
  | { kind: "speech"; playerId: string; text: string; ttlMs?: number; meta?: any }
  | { kind: string; [k: string]: any };

/** グローバルなUIエフェクトキュー（state.uiFxQueue を想定） */
export function pushUiFx(state: GameState, ev: UiFxEvent) {
  // state.uiFxQueue が無ければ初期化してからpush
  // @ts-ignore
  if (!state.uiFxQueue) {
    // @ts-ignore
    state.uiFxQueue = [];
  }
  // @ts-ignore
  state.uiFxQueue.push(ev);
}

/** 連打抑止用（同一キーに対するクールダウン） */
const uiFxCooldown: Record<string, number> = {};

/**
 * クールダウン & 確率つきの発火ヘルパ
 * 例: queueFx(state, { kind:'emoji', playerId:'cpu-08', emoji:'💦' }, 900, 0.8)
 */
export function queueFx(
  state: GameState,
  ev: UiFxEvent & { meta?: any },
  cooldown = 900,
  prob = 1.0,
) {
  const pid =
    (ev as any).playerId ??
    (ev as any).by ??
    (ev as any).meta?.target ??
    "all";
  const key = `${(ev as any).kind}:${pid}`;
  const now = Date.now();

  if (Math.random() > prob) return;
  if (uiFxCooldown[key] && now - uiFxCooldown[key] < cooldown) return;

  uiFxCooldown[key] = now;
  pushUiFx(state, ev);
}
