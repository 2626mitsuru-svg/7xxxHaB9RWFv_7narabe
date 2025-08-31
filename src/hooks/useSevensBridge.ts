import { 
  useState,
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import {
  GameState,
  Player,
  Move,
  Card,
  ReactionEvent,
  SpeechBubble,
  PlayerSpeechState,
} from "../types/game";
import {
  initializeGame,
  getLegalMoves,
  getMaxPassCount,
  pushUiFx,
} from "../utils/gameLogic";
import {
  beginTurn,
  applyAction,
  advanceTurn,
  decideCPUAction,
} from "../utils/turnLoop";
import { getCPUColor } from "../utils/cpuColors";
import { speakByPlayerId, EventKey } from "../data/events";
import { useExpressionController } from "./useExpressionController";
import { executeSpecialCombinationSpeech } from "../utils/startingCombinationSpeech";

// useSevensBridge.ts（ファイル先頭の import 群の下あたり）
const REACTION_DEBOUNCE_MS = 250;

type ReactionState = {
  timeout: ReturnType<typeof setTimeout> | null;
  epoch: number;
  lastEmoji: string;
  lastSet: number;
};
const reactionStatesRef = useRef<Record<string /*playerId*/, ReactionState>>({});

// 1122 相当：一時絵文字のセット → TTL後に自動クリア（重複抑制＆レース除去）
const setReactionEmoji = useCallback((playerId: string, emoji: string, ttl = 4000) => {
  const now = Date.now();
  const st = reactionStatesRef.current[playerId] ?? { timeout: null, epoch: 0, lastEmoji: '', lastSet: 0 };

  // 同じ絵文字の連打はデバウンス
  if (st.lastEmoji === emoji && (now - st.lastSet) < REACTION_DEBOUNCE_MS) return;

  // 世代更新＆前タイマー停止
  st.epoch += 1;
  const myEpoch = st.epoch;
  if (st.timeout) clearTimeout(st.timeout);

  // GameState に反映
  setGameState(prev => {
    if (!prev) return prev;
    return {
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, reactionEmoji: emoji } : p),
    };
  });

  st.lastEmoji = emoji;
  st.lastSet = now;

  // TTL後に自動クリア（世代チェックでレース除去）
  st.timeout = setTimeout(() => {
    const cur = reactionStatesRef.current[playerId];
    if (!cur || cur.epoch !== myEpoch) return; // 新しい絵文字が後から来ていたら何もしない
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p =>
          (p.id === playerId && p.reactionEmoji === emoji) ? { ...p, reactionEmoji: undefined } : p
        ),
      };
    });
    cur.timeout = null;
  }, ttl);

  reactionStatesRef.current[playerId] = st;
}, [setGameState]);


/**
 * 七並べゲーム制御フック（Speech Dispatcher版）
 * - 全面的な発話ロジック再設計
 * - 自動消去禁止、上書きのみ
 * - 自分は即時、他人は0.2-0.3秒遅延
 * - ★終了系イベント最優先処理対応
 * - ★セリフ未表示問題修正：上がり・ドボン・パス時の確実な発話
 */

export interface GameSpeed {
  value: number;
  label: string;
}

export const GAME_SPEEDS: GameSpeed[] = [
  { value: 2500, label: "遅い" },
  { value: 1500, label: "標準" },
  { value: 800, label: "速い" },
  { value: 200, label: "最速" },
];

// === Speech Dispatcher: begin ===
type EventAudience = "self" | "others" | "all";

let currentGameState: GameState | null = null;
let setPlayerSpeechesRef: React.Dispatch<
  React.SetStateAction<PlayerSpeechState>
> | null = null;

// ★終了系キーリスト（最優先処理対象）
const FINISH_KEYS: EventKey[] = [
  "WINNER",
  "FINISH_FOUL", 
  "FINISH_PASS_OVER",
  "SELF_ELIMINATED",
  "FINISH_1ST",
  "FINISH_2ND",
  "FINISH_3RD",
  "LAST_PLACE_CONFIRMED",
];

// ★終了系イベントに対応する永続表情マップ
const FINISH_EXPRESSION_MAP: Record<EventKey, Expression> = {
  "WINNER": "happy",
  "FINISH_1ST": "happy",
  "FINISH_2ND": "neutral",
  "FINISH_3RD": "neutral", 
  "FINISH_FOUL": "disappointed",
  "FINISH_PASS_OVER": "disappointed",
  "SELF_ELIMINATED": "disappointed",
  "LAST_PLACE_CONFIRMED": "disappointed",
};

// 「…」で thinking 表示にする（TURN_STARTや開始時の初期化で利用）（保護機能対応）
function setThinking(playerId: string) {
  const setter = setPlayerSpeechesRef;
  if (!setter) {
    return;
  }
  
  // ★保護されたセリフがある場合は思考表示もしない
  setter((prev) => {
    const current = prev[playerId];
    if (current?.isProtected) {
      return prev; // 上書きせず維持
    }
    
    return {
      ...prev,
      [playerId]: { playerId, text: "…", timestamp: Date.now(), isProtected: false },
    };
  });
}

// 表情制御の参照（speak関数から使用）
let expressionControllerRef: {
  setExpressionFromEvent: (playerId: string, eventKey: EventKey, options?: { ttlMs?: number; reason?: string }) => void;
  setPermanentExpression: (playerId: string, expression: any, reason?: string) => void;
} | null = null;

// speak()の早期return緩和とsetterフォールバック（終了セリフ保護対応）
function speak(
  playerId: string,
  key: EventKey,
  setPlayerSpeeches?: React.Dispatch<React.SetStateAction<PlayerSpeechState>>,
) {
  const msg = speakByPlayerId(playerId, key);
  
  // setter のフォールバック
  const setter = setPlayerSpeechesRef ?? setPlayerSpeeches;

  if (!setter) {
    console.error(`[Speech] No setter available for ${playerId}/${key}`);
    return;
  }

  // ★追加：セリフ発火時に表情も設定
  if (expressionControllerRef) {
    // 終了系キーの場合は永続表情を設定
    if (FINISH_KEYS.includes(key) && FINISH_EXPRESSION_MAP[key]) {
      console.debug(`[Speech] Setting permanent expression for finish event: ${playerId} -> ${FINISH_EXPRESSION_MAP[key]} (${key})`);
      expressionControllerRef.setPermanentExpression(playerId, FINISH_EXPRESSION_MAP[key], `finish:${key}`);
    } else {
      // 通常のイベント駆動表情設定
      expressionControllerRef.setExpressionFromEvent(playerId, key, { reason: `speech:${key}` });
    }
  }

  // ★終了系キーは必ず強制上書き（メッセージが空でもフォールバック）＋保護フラグ設定
  if (FINISH_KEYS.includes(key)) {
    const text = msg || "…"; // 空の場合は最低限表示
    setter((prev) => ({
      ...prev,
      [playerId]: { playerId, text, timestamp: Date.now(), isProtected: true },
    }));
    return;
  }

  // ★保護されたセリフがある場合は上書きしない
  setter((prev) => {
    const current = prev[playerId];
    if (current?.isProtected) {
      return prev; // 上書きせず維持
    }

    if (!msg) {
      return prev; // 上書きせず維持
    }

    return {
      ...prev,
      [playerId]: { playerId, text: msg, timestamp: Date.now(), isProtected: false },
    };
  });
}

// ★修正：他人リアクション用の遅延（200-300ms統一）
function delayForOthers(): number {
  return 200 + Math.floor(Math.random() * 100); // 200ms + 0-99ms = 200-299ms
}

// 観測者単位の発話ユーティリティ
function emitTo(
  targetId: string,
  key: EventKey,
  setPlayerSpeeches?: React.Dispatch<React.SetStateAction<PlayerSpeechState>>,
) {
  const delay = delayForOthers();
  console.debug(`[Speech] emitTo(${targetId}, ${key}) with ${delay}ms delay`);
  setTimeout(() => speak(targetId, key, setPlayerSpeeches), delay);
}

/** 発話の実行ユーティリティ：自分は即時、他人は0.2–0.3s遅延 */
function emitSpeech(
  key: EventKey,
  actorId: string | null,
  audience: EventAudience = "all",
  setPlayerSpeeches?: React.Dispatch<React.SetStateAction<PlayerSpeechState>>,
) {
  if (!currentGameState || !currentGameState.players) return; // nullチェック強化
  const players = currentGameState.players;

  players.forEach((p) => {
    const isSelf = actorId && p.id === actorId;
    if (audience === "self" && !isSelf) return;
    if (audience === "others" && isSelf) return;

    const run = () => speak(p.id, key, setPlayerSpeeches);
    if (!isSelf) {
      const delay = delayForOthers();
      setTimeout(run, delay);
    } else {
      run();
    }
  });
}
// === Speech Dispatcher: end ===

/**
 * GameStateの基本構造を検証
 */
function validateGameStateForAction(state: GameState): {
  isValid: boolean;
  error?: string;
} {
  if (!state) {
    return {
      isValid: false,
      error: "GameState is null or undefined",
    };
  }

  if (!state.players || !Array.isArray(state.players)) {
    return {
      isValid: false,
      error: "state.players is not a valid array",
    };
  }

  if (state.players.length === 0) {
    return { isValid: false, error: "state.players is empty" };
  }

  if (
    typeof state.currentPlayerIndex !== "number" ||
    state.currentPlayerIndex < 0 ||
    state.currentPlayerIndex >= state.players.length
  ) {
    return {
      isValid: false,
      error: `Invalid currentPlayerIndex: ${state.currentPlayerIndex}`,
    };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) {
    return {
      isValid: false,
      error: "Current player is null or undefined",
    };
  }

  return { isValid: true };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface UIEffects {
  cardGlow?: { suit: string; rank: number };
}

export function useSevensBridge() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCPUs, setSelectedCPUs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(GAME_SPEEDS[1]);
  
  // 複数プレイヤーの発話状態管理
  const [playerSpeeches, setPlayerSpeeches] = useState<PlayerSpeechState>({});
  const [uiEffects, setUIEffects] = useState<UIEffects>({});
  
  // 表情制御システム
  const { setExpressionFromEvent, setPermanentExpression, getExpression, getExpressionUrl } = useExpressionController();

  const logThrottleRef = useRef<{
    lastUpdate: number;
    queue: string[];
  }>({ lastUpdate: 0, queue: [] });

  // stale-closure対策：最新gameStateをrefで保持
  const stateRef = useRef<GameState | null>(null);
  useEffect(() => {
    stateRef.current = gameState;
    currentGameState = gameState; // Speech Dispatcher用
  }, [gameState]);

  // useLayoutEffectでsetter参照を厳密化
  useLayoutEffect(() => {
    setPlayerSpeechesRef = setPlayerSpeeches;
    expressionControllerRef = { setExpressionFromEvent, setPermanentExpression };
    return () => {
      setPlayerSpeechesRef = null;
      expressionControllerRef = null;
    };
  }, [setExpressionFromEvent, setPermanentExpression]);

  // ---- Auto start after matchup (2s) ----
const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);



const scheduleAutoStart = () => {
  // 連打や再戦でも 1 個だけ動くように毎回クリアして取り直し
  if (autoStartTimerRef.current) {
    clearTimeout(autoStartTimerRef.current);
    autoStartTimerRef.current = null;
  }
  autoStartTimerRef.current = setTimeout(() => {
    // 3秒後に自動で進行開始
    // 自動進行ループを確実に始動（定義済みの autoPlay を呼ぶ）
    try { (autoPlay as any)?.(); } catch {}
  }, 3000);
};

// アンマウント時や画面切替時に漏れなくタイマー掃除
useEffect(() => {
  return () => {
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
  };
}, []);


  // ログスロットリング（最大4件/秒）
  const throttledLog = useCallback((message: string) => {
    const now = Date.now();
    const { lastUpdate, queue } = logThrottleRef.current;

    queue.push(message);

    if (now - lastUpdate >= 250) {
      // 4件/秒 = 250ms間隔
      if (queue.length > 0) {
        console.log("Game logs:", queue.slice(-4)); // 最新4件のみ
        logThrottleRef.current = { lastUpdate: now, queue: [] };
      }
    }
  }, []);

  // UIキュー処理（観測者単位の発話変換）
  useEffect(() => {
    const q = gameState?.uiFx?.queue ?? [];
    if (!q.length) return;

    q.forEach((ev) => {
      switch (ev.kind) {
              
        case "react:others:cardPlaced": {
          const targetId = (ev as any).meta?.target as string | undefined;
          if (targetId) {
            const blocked = !!(ev as any).meta?.blocked;
            // BLOCKされた観測者：ビックリ or 冷や汗（短め）
            setReactionEmoji(targetId, blocked ? "❗️" : "💦", blocked ? 1800 : 1400);
          }
          break;
        }
        case "react:others:pass": {
          // パスした本人に冷や汗
          const by = (ev as any).by as string;
          if (by) setReactionEmoji(by, "💦", 2000);
          break;
        }
        case "react:others:passStreak": {
          // 連続パス観測：全員に短い驚き
          (gameState?.players ?? [])
            .filter(p => !p.isFinished && !p.isEliminated)
            .forEach(p => setReactionEmoji(p.id, "❗️", 900));
          break;
        }
        case "react:self:starter": {
          // 先手確定：本人に♫（少し長め）
          setReactionEmoji((ev as any).playerId, "♫", 2400);
          break;
        }
        case "react:self:finish": {
          const id = (ev as any).playerId as string;
          const reason = (ev as any).reason as "win" | "foul" | "passOver" | "lastPlace";
          if (id) {
            // 勝利は🎉、脱落パターンは💦（やや長め）
            const emoji = (reason === "win") ? "🎉" : "💦";
            setReactionEmoji(id, emoji, 3200);
          }
          break;
        }
        case "react:others:massPlacement": {
          // ドボンの手札一斉展開：他者に💥
          const loserId = (ev as any).loserId as string;
          (gameState?.players ?? [])
            .filter(p => p.id !== loserId)
            .forEach(p => setReactionEmoji(p.id, "💥", 1800));
          break;
        }
        case "react:others:eliminated": {
          // 誰かが脱落：他者に短い💦
          const pid = (ev as any).playerId as string;
          (gameState?.players ?? [])
            .filter(p => p.id !== pid)
            .forEach(p => setReactionEmoji(p.id, "💦", 1200));
          break;
        }
        
        case "react:others:cardPlaced": {
          // meta.target に観測者ID、meta.blocked で BLOCK/NORMAL を判定済み
          const targetId = (ev as any).meta?.target as string | undefined;
          if (!targetId) break;
          const key = (ev as any).meta?.blocked
            ? "OTHER_OPP_BLOCK"
            : "OTHER_OPP_NORMAL";
          console.debug(`[UIEffect] Card placed reaction: ${targetId} -> ${key}`);
          // 観測者単位発話（0.2-0.3秒遅延）
          emitTo(targetId, key, setPlayerSpeeches);
          break;
        }
        case "react:others:pass": {
          // ★修正B-2：他人がパス時のセリフ（200-300ms遅延統一）
          const targetId = (ev as any).meta?.target as string | undefined;
          let key: EventKey | undefined = (ev as any).meta?.key;

          if (!targetId) {
            console.warn(`[UIEffect] react:others:pass missing targetId:`, ev);
            break;
          }

          // 詳細ログ
          console.debug(`[UIEffect] Pass reaction - targetId: ${targetId}, meta.key: ${key}`);

          if (!key) {
            // フォールバック：ブリッジ側で算出
            const observer = gameState?.players?.find((p) => p.id === targetId);
            const maxPass = getMaxPassCount(gameState?.options || {});
            const observerPassCount = observer?.passCount || 0;

            key = observerPassCount >= maxPass ? "OTHER_PASS_RISK" : "OTHER_PASS_NORMAL";

            console.debug(
              `[UIEffect] Fallback computed pass key: ${targetId} -> ${key} (passCount: ${observerPassCount}/${maxPass})`
            );
          }

          console.debug(`[UIEffect] Final pass reaction: ${targetId} -> ${key}`);

          // ★修正：200-300ms遅延に統一
          setTimeout(
            () => speak(targetId, key as EventKey, setPlayerSpeeches),
            200 + Math.floor(Math.random() * 100)
          );
          break;
        }
        case "react:others:passStreak": {
          console.debug(`[UIEffect] Pass streak observed`);
          emitSpeech("PASS_STREAK_OBSERVED", null, "all", setPlayerSpeeches);
          break;
        }
        case "react:others:blockReleased": {
          console.debug(`[UIEffect] Block released by ${(ev as any).by}`);
          emitSpeech("OPP_BLOCK_RELEASED", (ev as any).by, "others", setPlayerSpeeches);
          break;
        }
        case "react:others:eliminated": {
          console.debug(`[UIEffect] Player eliminated: ${(ev as any).playerId}`);
          emitSpeech("OTHER_ELIMINATED", (ev as any).playerId, "others", setPlayerSpeeches);
          break;
        }
        case "react:others:massPlacement": {
          console.debug(`[UIEffect] Mass placement by ${(ev as any).loserId}`);
          emitSpeech("ELIMINATION_MASS_PLACEMENT", (ev as any).loserId, "others", setPlayerSpeeches);
          break;
        }
        case "react:self:finish": {
          // ★���正A-1：上がり・ドボン（finish系）を確実に出す
          const playerId = (ev as any).playerId;
          const reason = (ev as any).reason as "win" | "foul" | "passOver" | "lastPlace";
          console.debug(`[UIEffect] Self finish: ${playerId} (${reason}) - emitting finish speech`);

          if (reason === "win") {
            emitSpeech("WINNER", playerId, "self", setPlayerSpeeches);
            // 勝利時の永続表情はspeak関数内で設定される
          } else if (reason === "lastPlace") {
            emitSpeech("LAST_PLACE_CONFIRMED", playerId, "self", setPlayerSpeeches);
            // 最下位時の永続表情はspeak関数内で設定される
          } else if (reason === "foul") {
            emitSpeech("FINISH_FOUL", playerId, "self", setPlayerSpeeches);
            emitSpeech("SELF_ELIMINATED", playerId, "self", setPlayerSpeeches); // 併発
            // 脱落時の永続表情はspeak関数内で設定される
          } else if (reason === "passOver") {
            emitSpeech("FINISH_PASS_OVER", playerId, "self", setPlayerSpeeches);
            emitSpeech("SELF_ELIMINATED", playerId, "self", setPlayerSpeeches); // 併発
            // 脱落時の永続表情はspeak関数内で設定される
          }

          console.debug(`[UIEffect] Emitted finish speech for ${playerId} with reason ${reason}`);

          // ★終了後のリセットタイミング調整（150ms後にリセット系処理を開始）
          setTimeout(() => {
            console.debug(`[UIEffect] Finish speech display period completed for ${playerId}`);
          }, 150);

          break;
        }
        case "react:self:rank": {
          const playerId = (ev as any).playerId;
          const key = (ev as any).meta?.key as EventKey;
          const rank = (ev as any).meta?.rank as number;
          if (key) {
            console.debug(`[UIEffect] Self rank: ${playerId} -> ${key} (rank: ${rank})`);
            emitSpeech(key, playerId, "self", setPlayerSpeeches);
            // 順位に応じた永続表情はspeak関数内で設定される
          }
          break;
        }
        case "react:others:lastPlace": {
          // ★修正A-2：最下位確定の確実な表示（最下位の人のみ）
          const lastPlacePlayerId = (ev as any).playerId;
          console.debug(`[UIEffect] Last place confirmed: ${lastPlacePlayerId}`);
          if (lastPlacePlayerId) {
            emitSpeech("LAST_PLACE_CONFIRMED", lastPlacePlayerId, "self", setPlayerSpeeches);
          }
          break;
        }
        case "react:self:starter": {
          const playerId = (ev as any).playerId;
          console.debug(`[UIEffect] Starter decided: ${playerId}`);
          emitSpeech("STARTER_DECIDED", playerId, "self", setPlayerSpeeches);
          break;
        }
        case "react:others:doomedDetected": {
          const targetId = (ev as any).meta?.target as string | undefined;
          if (targetId) {
            console.debug(`[UIEffect] Doomed detected (others): ${targetId}`);
            emitTo(targetId, "DOOMED_DETECTED", setPlayerSpeeches);
          }
          break;
        }
        case "react:self:doomedDetected": {
          const playerId = (ev as any).playerId as string | undefined;
          if (playerId) {
            console.debug(`[UIEffect] Doomed detected (self): ${playerId}`);
            emitSpeech("DOOMED_DETECTED", playerId, "self", setPlayerSpeeches);
          }
          break;
        }
        default:
          console.debug(`[UIEffect] Unhandled event kind: ${ev.kind}`);
          break;

          
      }
    });

    // キューをクリア
    if (gameState) {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              uiFx: { ...prev.uiFx, queue: [] },
            }
          : prev
      );
    }
  }, [gameState?.uiFx?.queue]);

  const selectCPUs = useCallback((cpuIds: string[]) => {
    setSelectedCPUs(cpuIds);
  }, []);

  const startGame = useCallback(() => {
    if (selectedCPUs.length !== 4) return;

    try {
      const newGameState = initializeGame(selectedCPUs, {});

      // 初期化後の状態検証
      const validation = validateGameStateForAction(newGameState);
      if (!validation.isValid) {
        console.error("[startGame] Initial game state is invalid:", validation.error);
        return;
      }

      newGameState.options.debugFx = false;

      console.debug("[startGame] 52-card game started with CPUs:", selectedCPUs);

      setGameState(newGameState);
      setIsPlaying(true);

      // 全員の吹き出しを「…」で初期化���常時表示ベース）
      const initial: PlayerSpeechState = {};
      selectedCPUs.forEach((id) => {
        initial[id] = {
          playerId: id,
          text: "…",
          timestamp: Date.now(),
          isProtected: false, // ★追加：初期化時は保護されていない
        };
      });
      setPlayerSpeeches(initial);
      setUIEffects({});

      // Speech Dispatcher用の参照を更新
      currentGameState = newGameState;

      // 直後に初期イベントを発話
      setTimeout(() => {
        console.debug("[startGame] Emitting initial events");
        
        // ★新機能：組み合わせ特殊セリフシステム
        const specialSpeechSpeaker = executeSpecialCombinationSpeech(selectedCPUs, setPlayerSpeeches);
        
        console.debug(
          `[useSevensBridge] Special speech result - specialSpeechSpeaker: "${specialSpeechSpeaker}", selectedCPUs: [${selectedCPUs.map(id => `"${id}"`).join(', ')}]`
        );
        
        // ★特殊セリフが適用されなかった場合のみEVT_PLAYERS_CONFIRMEDを発話（保護付き）
        if (!specialSpeechSpeaker) {
          // 一括でsetPlayerSpeechesを更新し、タイマーも一つだけ作成
          const speechUpdates: PlayerSpeechState = {};
          selectedCPUs.forEach((playerId) => {
            const message = speakByPlayerId(playerId, "EVT_PLAYERS_CONFIRMED");
            if (message) {
              speechUpdates[playerId] = {
                playerId,
                text: message,
                timestamp: Date.now(),
                isProtected: true, // ★保護フラグで3秒表示
              };
            }
          });

          if (Object.keys(speechUpdates).length > 0) {
            setPlayerSpeeches((prev: any) => ({
              ...prev,
              ...speechUpdates,
            }));

            // ★3秒後に一括で保護解除（タイマーは一つだけ）
            setTimeout(() => {
              setPlayerSpeeches((prev: any) => {
                const updates = { ...prev };
                Object.keys(speechUpdates).forEach((playerId) => {
                  if (updates[playerId]) {
                    updates[playerId] = {
                      ...updates[playerId],
                      isProtected: false,
                    };
                  }
                });
                return updates;
              });
            }, 3000);
          }
        } else {
          console.debug(`[useSevensBridge] Special speech applied by "${specialSpeechSpeaker}", skipping EVT_PLAYERS_CONFIRMED for all players`);
        }

        scheduleAutoStart();

        
        // 他の初期イベントは少し遅らせて発話（特殊セリフを見せるため）
        setTimeout(() => {
          emitSpeech("DEALT_HAND_EVAL", null, "all", setPlayerSpeeches);
          emitSpeech("AUTO_PLACE_SEVENS", null, "all", setPlayerSpeeches);
        }, specialSpeechSpeaker ? 3200 : 200); // 特殊セリフありの場合は3.2秒待つ
      }, 100);
    } catch (error) {
      console.error("[startGame] Failed to initialize game:", error);
    }
  }, [selectedCPUs]);

  const resetGame = useCallback(() => {
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    setGameState(null);
    setIsPlaying(false);

    // 全プレイヤーの発話状態をクリア
    setPlayerSpeeches({});
    setUIEffects({});
    logThrottleRef.current = { lastUpdate: 0, queue: [] };

    // Speech Dispatcher用の参照もクリア
    currentGameState = null;
  }, []);

  // ターン処理（新アーキテクチャ対応）★修正：即座に「…」表示、遅延後に行動
  const playTurn = useCallback(() => {
    if (!gameState || gameState.gamePhase !== "playing") return;

    const delay = gameSpeed.value >= 2000 ? 300 : gameSpeed.value >= 1000 ? 180 : 120;

    // ★第一段階：即座に思考表示（「…」）
    setGameState((prevState) => {
      if (!prevState) return prevState;

      // アクション適用前の状態検証
      const validation = validateGameStateForAction(prevState);
      if (!validation.isValid) {
        console.error("[playTurn] GameState validation failed:", validation.error);
        return prevState;
      }

      console.debug("[playTurn] Starting turn (Phase 1: immediate thinking display)", {
        turn: prevState.turn,
        currentPlayer: prevState.currentPlayerIndex,
        phase: prevState.turnPhase,
      });

      // ターン開始
      let updatedState = beginTurn({ ...prevState });

      // 現在のプレイヤーを取得
      const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.isEliminated || currentPlayer.isFinished) {
        console.debug("[playTurn] Current player eliminated/finished, advancing");
        return advanceTurn(updatedState);
      }

      // ★修正：即座に「…」を表示（UIキューを介さずに直接設定）
      console.debug(`[playTurn] Immediately setting "…" for ${currentPlayer.id}`);
      setThinking(currentPlayer.id);

      console.debug(`[playTurn] Phase 1 complete: immediate "…" displayed for ${currentPlayer.id}`);
      return updatedState;
    });

    // ★第二段階：少し待ってから思考・行動
    setTimeout(() => {
      setGameState((prevState) => {
        if (!prevState || prevState.gamePhase !== "playing") return prevState;

        console.debug("[playTurn] Starting Phase 2: CPU decision and action");

        // 現在のプレイヤーを取得
        const currentPlayer = prevState.players[prevState.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.isEliminated || currentPlayer.isFinished) {
          console.debug("[playTurn] Current player eliminated/finished, advancing");
          return advanceTurn(prevState);
        }

        // 合法手状態チェック（nullチェック追加）
        const legalMoves = getLegalMoves(prevState, currentPlayer.id) || [];
        console.debug(`[playTurn] Legal moves for ${currentPlayer.id}:`, 
          legalMoves.map(m => `${m.card?.suit}${m.card?.rank}`));
        
        if (legalMoves.length === 0) {
          console.debug(`[playTurn] No legal moves for ${currentPlayer.id}`);
          emitSpeech("NO_LEGAL_MOVES_DETECTED", currentPlayer.id, "self", setPlayerSpeeches);
        } else if (legalMoves.length >= 2) {
          console.debug(`[playTurn] Multiple legal moves for ${currentPlayer.id}: ${legalMoves.length} options`);
          emitSpeech("MULTIPLE_LEGAL_MOVES", currentPlayer.id, "self", setPlayerSpeeches);
        }

        // パス警告の発話
        const maxPass = prevState.options.maxPass ?? 3;
        const remainingPasses = maxPass - currentPlayer.passCount;
        if (remainingPasses <= 1) {
          console.debug(`[playTurn] Pass warning for ${currentPlayer.id} (remaining: ${remainingPasses})`);
          emitSpeech("PASS_WARNING", currentPlayer.id, "self", setPlayerSpeeches);
        }

        // 必出状���チェック
        if (remainingPasses === 0 && legalMoves.length > 0) {
          console.debug(`[playTurn] Must play state for ${currentPlayer.id}`);
          emitSpeech("MUST_PLAY_STATE", currentPlayer.id, "self", setPlayerSpeeches);
        }

        // 脱落危機警告
        if (currentPlayer.passCount === maxPass && legalMoves.length === 0) {
          console.debug(`[playTurn] Elimination risk for ${currentPlayer.id}`);
          emitSpeech("ELIM_RISK_WARNING", currentPlayer.id, "self", setPlayerSpeeches);
        }

        // CPU行動決定
        const action = decideCPUAction(prevState, currentPlayer.id);

        console.debug("[playTurn] Action decided", {
          playerId: currentPlayer.id,
          actionType: action.type,
          card: action.card ? `${action.card.suit}${action.card.rank}` : "none",
        });

        // ★修正B-1：自分がパス時のセリフ（思考状態をクリア）
        if (action.type === "pass") {
          if (legalMoves.length > 0) {
            // 既存：戦略的パス
            console.debug(`[playTurn] Strategic pass by ${currentPlayer.id}`);
            speak(currentPlayer.id, "PASS_STRATEGIC", setPlayerSpeeches);
          } else {
            // 追加：出せる手が無くてパス
            console.debug(`[playTurn] Forced pass by ${currentPlayer.id}`);
            speak(currentPlayer.id, "PASS_DECIDED", setPlayerSpeeches);
          }
        }

        // アクション適用前に再度検証
        const preActionValidation = validateGameStateForAction(prevState);
        if (!preActionValidation.isValid) {
          console.error("[playTurn] Pre-action validation failed:", preActionValidation.error);
          return prevState; // 元の状態を返す
        }

        // アクション適用
        const { state: newState, result } = applyAction(prevState, action);

        // ★修正：カード提出時のセリフ（思考状態をクリア）
        if (action.type === "place") {
          const meta = (newState as any).lastPlaced || {};
          let speechKey = "PLAY_NORMAL"; // デフォルト

          if (meta.wasNewEnd) {
            console.debug(`[playTurn] New end opened by ${currentPlayer.id}`);
            speechKey = "OPEN_NEW_END";
          } else if (meta.extendedEnd) {
            console.debug(`[playTurn] Extended existing end by ${currentPlayer.id}`);
            speechKey = "EXTEND_EXISTING_END";
          } else if (meta.unblockedSelf) {
            console.debug(`[playTurn] Unblocked self suit by ${currentPlayer.id}`);
            speechKey = "UNBLOCK_SELF_SUIT";
          } else if (meta.isReleaseBlock) {
            console.debug(`[playTurn] Released block by ${currentPlayer.id}`);
            speechKey = "RELEASE_BLOCK";
          } else {
            console.debug(`[playTurn] Normal play by ${currentPlayer.id}`);
            speechKey = "PLAY_NORMAL";
          }

          // 思考状態をクリアして提出セリフを表示
          speak(currentPlayer.id, speechKey as EventKey, setPlayerSpeeches);

          // ★修正C：AK完成判定の追加チェック
          if (meta.completedAKtoA) {
            console.debug(`[playTurn] AK complete to A by ${currentPlayer.id}`);
            speak(currentPlayer.id, "AK_COMPLETE_TO_A", setPlayerSpeeches);
          }
          if (meta.completedAKtoK) {
            console.debug(`[playTurn] AK complete to K by ${currentPlayer.id}`);
            speak(currentPlayer.id, "AK_COMPLETE_TO_K", setPlayerSpeeches);
          }
        }

        console.debug("[playTurn]", {
          phase: result.nextPhase,
          currentPlayerIndex: newState.currentPlayerIndex,
          lock: newState.actionLock,
          success: result.success,
          uiQueueLength: newState.uiFx?.queue?.length || 0,
        });

        throttledLog(`${currentPlayer.name}: ${result.message}`);

        // 結果に応じた分岐処理
        if (result.nextPhase === "turn:advance") {
          return advanceTurn(newState);
        }
        if (result.nextPhase === "game:finished") {
          return { ...newState, gamePhase: "finished" };
        }

        // 最終ガード：どの分岐にも該当しない場合は強制前進
        console.debug("[playTurn] Final guard: forcing advance", {
          nextPhase: result.nextPhase,
          success: result.success,
        });
        newState.actionLock = false;
        return advanceTurn(newState);
      });
    }, delay);
  }, [gameState, gameSpeed.value, throttledLog]);

  // ★削除：順位・脱落表情設定はspeak関数内で一元化

  // オートプレイの正負逆転防止
  const autoPlay = useCallback(() => {
    // 既存のタイマーがあれば必ずクリア
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }

    const loop = () => {
      // 最新状態を再チェック
      const st = stateRef.current;
      if (!st || st.gamePhase !== "playing") {
        console.debug("[autoPlay] Game not playing, stopping");
        return;
      }

      console.debug("[autoPlay] Running turn", {
        turn: st.turn,
        phase: st.gamePhase,
      });

      // 最新のplayTurnを実行
      playTurn();

      autoPlayRef.current = setTimeout(loop, gameSpeed.value);
    };

    loop();
  }, [gameSpeed.value, playTurn]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, []);

  return {
    gameState,
    selectedCPUs,
    isPlaying,
    gameSpeed,
    playerSpeeches,
    uiEffects,
    selectCPUs,
    startGame,
    playTurn,
    autoPlay,
    resetGame,
    setGameSpeed,
    getExpression,
    getExpressionUrl,
  };
}