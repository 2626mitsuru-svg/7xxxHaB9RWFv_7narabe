// 1122準拠：イベントごとに emoji, prob(0-1), ttl, cooldown(ms)
import { EventKey } from "../data/events";

type Rule = { emojis: string[]; prob: number; ttl: number; cooldown: number };
export const REACTION_RULES: Partial<Record<EventKey, Rule>> = {
  MULTIPLE_LEGAL_MOVES: { emojis: ['💬'],     prob: 0.7, ttl: 1400, cooldown: 900 },
  PASS_WARNING:         { emojis: ['💦'],    prob: 1.0, ttl: 1400, cooldown: 900 },
  MUST_PLAY_STATE:      { emojis: ['💦'],    prob: 1.0, ttl: 1400, cooldown: 900 },
  ELIM_RISK_WARNING:    { emojis: ['💦'],    prob: 1.0, ttl: 1400, cooldown: 900 },
  HAND_COUNT_ONE:       { emojis: ['❗️'],   prob: 1.0, ttl: 1600, cooldown: 1200 },
  WINNER:               { emojis: ['🎉'],    prob: 1.0, ttl: 1600, cooldown: 1200 },
  AUTO_PLACE_SEVENS:    { emojis: ['✨','🎉'], prob: 0.6, ttl: 1400, cooldown: 900 },
  // 必要に応じて追加（1122は「限定イベントのみ」）
};
