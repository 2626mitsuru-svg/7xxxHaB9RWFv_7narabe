import { REACTION_RULES } from "./reactionRules";
import { pushUiFx } from "../utils/gameLogic"; // 既存のUI集約
import { EventKey } from "../data/events";

const lastShownAt: Record<string, number> = {}; // playerId+event → last ts

export function tryEmitEmoji(playerId: string, event: EventKey) {
  const rule = REACTION_RULES[event];
  if (!rule) return;

  const key = `${playerId}:${event}`;
  const now = Date.now();
  if (lastShownAt[key] && now - lastShownAt[key] < rule.cooldown) return;
  if (Math.random() > rule.prob) return;

  lastShownAt[key] = now;
  const emoji = rule.emojis[(Math.random() * rule.emojis.length) | 0];
  pushUiFx('emoji', { playerId, emoji, ttlMs: rule.ttl }); // ← UIへ
}
