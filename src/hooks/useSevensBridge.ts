'use client';

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react';

import type { GameState, PlayerSpeechState } from '../types/game';
import {
  initializeGame,
  getLegalMoves,
  getMaxPassCount,
} from '../utils/gameLogic';
import {
  beginTurn,
  applyAction,
  advanceTurn,
  decideCPUAction,
} from '../utils/turnLoop';
import { useExpressionController } from './useExpressionController';
import { speakByPlayerId, EventKey } from '../data/events';
import { executeSpecialCombinationSpeech } from '../utils/startingCombinationSpeech';

/* -------------------- 定数・ヘルパ（フック以外OK） -------------------- */

export interface GameSpeed {
  value: number;
  label: string;
}
export const GAME_SPEEDS: GameSpeed[] = [
  { value: 2500, label: '遅い' },
  { value: 1500, label: '標準' },
  { value: 800, label: '速い' },
  { value: 200, label: '最速' },
];

type EventAudience = 'self' | 'others' | 'all';

let currentGameState: GameState | null = null;
let setPlayerSpeechesRef:
  | React.Dispatch<React.SetStateAction<PlayerSpeechState>>
  | null = null;

const FINISH_KEYS: EventKey[] = [
  'WINNER',
  'FINISH_FOUL',
  'FINISH_PASS_OVER',
  'SELF_ELIMINATED',
  'FINISH_1ST',
  'FINISH_2ND',
  'FINISH_3RD',
  'LAST_PLACE_CONFIRMED',
];

const FINISH_EXPRESSION_MAP: Record<EventKey, any> = {
  WINNER: 'happy',
  FINISH_1ST: 'happy',
  FINISH_2ND: 'neutral',
  FINISH_3RD: 'neutral',
  FINISH_FOUL: 'disappointed',
  FINISH_PASS_OVER: 'disappointed',
  SELF_ELIMINATED: 'disappointed',
  LAST_PLACE_CONFIRMED: 'disappointed',
};

let expressionControllerRef:
  | {
      setExpressionFromEvent: (
        playerId: string,
        eventKey: EventKey,
        options?: { ttlMs?: number; reason?: string }
      ) => void;
      setPermanentExpression: (
        playerId: string,
        expression: any,
        reason?: string
      ) => void;
    }
  | null = null;

function setThinking(playerId: string) {
  const setter = setPlayerSpeechesRef;
  if (!setter) return;
  setter(prev => {
    const cur = prev[playerId];
    if (cur?.isProtected) return prev;
    return {
      ...prev,
      [playerId]: { playerId, text: '…', timestamp: Date.now(), isProtected: false },
    };
  });
}

function emitSpeech(
  key: EventKey,
  actorId: string | null,
  audience: EventAudience = 'all',
  setPlayerSpeeches?: React.Dispatch<React.SetStateAction<PlayerSpeechState>>
) {
  if (!currentGameState?.players) return;
  currentGameState.players.forEach(p => {
    const isSelf = actorId && p.id === actorId;
    if (audience === 'self' && !isSelf) return;
    if (audience === 'others' && isSelf) return;
    speak(p.id, key, setPlayerSpeeches);
  });
}

function speak(
  playerId: string,
  key: EventKey,
  setPlayerSpeeches?: React.Dispatch<React.SetStateAction<PlayerSpeechState>>
) {
  const msg = speakByPlayerId(playerId, key);
  const setter = setPlayerSpeechesRef ?? setPlayerSpeeches;
  if (!setter) return;

  if (expressionControllerRef) {
    if (FINISH_KEYS.includes(key) && FINISH_EXPRESSION_MAP[key]) {
      expressionControllerRef.setPermanentExpression(
        playerId,
        FINISH_EXPRESSION_MAP[key],
        `finish:${key}`
      );
    } else {
      expressionControllerRef.setExpressionFromEvent(playerId, key, {
        reason: `speech:${key}`,
      });
    }
  }

  if (FINISH_KEYS.includes(key)) {
    setter(prev => ({
      ...prev,
      [playerId]: {
        playerId,
        text: msg || '…',
        timestamp: Date.now(),
        isProtected: true,
      },
    }));
    return;
  }

  setter(prev => {
    const cur = prev[playerId];
    if (cur?.isProtected) return prev;
    if (!msg) return prev;
    return {
      ...prev,
      [playerId]: { playerId, text: msg, timestamp: Date.now(), isProtected: false },
    };
  });
}

function validateGameStateForAction(state: GameState): {
  isValid: boolean;
  error?: string;
} {
  if (!state) return { isValid: false, error: 'GameState is null or undefined' };
  if (!Array.isArray(state.players)) return { isValid: false, error: 'state.players is not array' };
  if (state.players.length === 0) return { isValid: false, error: 'state.players is empty' };
  if (
    typeof state.currentPlayerIndex !== 'number' ||
    state.currentPlayerIndex < 0 ||
    state.currentPlayerIndex >= state.players.length
  )
    return { isValid: false, error: `Invalid currentPlayerIndex: ${state.currentPlayerIndex}` };
  if (!state.players[state.currentPlayerIndex])
    return { isValid: false, error: 'Current player is null/undefined' };
  return { isValid: true };
}

/* -------------------- フック本体（ここから中でだけフック使用） -------------------- */

export function useSevensBridge() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCPUs, setSelectedCPUs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(GAME_SPEEDS[1]);
  const [playerSpeeches, setPlayerSpeeches] = useState<PlayerSpeechState>({});
  const [uiEffects, setUIEffects] = useState<Record<string, unknown>>({});

  const {
    setExpressionFromEvent,
    setPermanentExpression,
    getExpression,
    getExpressionUrl,
  } = useExpressionController();

  // ここならOK
  const reactionStatesRef = useRef<
    Record<
      string,
      { timeout: ReturnType<typeof setTimeout> | null; epoch: number; lastEmoji: string; lastSet: number }
    >
  >({});
  const REACTION_DEBOUNCE_MS = 250;

  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logThrottleRef = useRef<{ lastUpdate: number; queue: string[] }>({
    lastUpdate: 0,
    queue: [],
  });

  useEffect(() => {
    currentGameState = gameState;
  }, [gameState]);

  useLayoutEffect(() => {
    setPlayerSpeechesRef = setPlayerSpeeches;
    expressionControllerRef = { setExpressionFromEvent, setPermanentExpression };
    return () => {
      setPlayerSpeechesRef = null;
      expressionControllerRef = null;
    };
  }, [setExpressionFromEvent, setPermanentExpression]);

  const setReactionEmoji = useCallback(
    (playerId: string, emoji: string, ttl = 4000) => {
      const now = Date.now();
      const st =
        reactionStatesRef.current[playerId] ?? {
          timeout: null,
          epoch: 0,
          lastEmoji: '',
          lastSet: 0,
        };

      if (st.lastEmoji === emoji && now - st.lastSet < REACTION_DEBOUNCE_MS) return;

      st.epoch += 1;
      const myEpoch = st.epoch;
      if (st.timeout) clearTimeout(st.timeout);

      setGameState(prev =>
        prev
          ? {
              ...prev,
              players: prev.players.map(p => (p.id === playerId ? { ...p, reactionEmoji: emoji } : p)),
            }
          : prev
      );

      st.lastEmoji = emoji;
      st.lastSet = now;

      st.timeout = setTimeout(() => {
        const cur = reactionStatesRef.current[playerId];
        if (!cur || cur.epoch !== myEpoch) return;
        setGameState(prev =>
          prev
            ? {
                ...prev,
                players: prev.players.map(p =>
                  p.id === playerId && p.reactionEmoji === emoji ? { ...p, reactionEmoji: undefined } : p
                ),
              }
            : prev
        );
        cur.timeout = null;
      }, ttl);

      reactionStatesRef.current[playerId] = st;
    },
    [setGameState]
  );

  const scheduleAutoStart = useCallback(() => {
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    autoStartTimerRef.current = setTimeout(() => {
      try {
        autoPlay();
      } catch {}
    }, 3000);
  }, []); // autoPlay は後で定義。参照時には安定している

  // UIキュー（emoji＋speechの“重複case”を1つに統合）
  useEffect(() => {
    const q = gameState?.uiFx?.queue ?? [];
    if (!q.length) return;

    q.forEach(ev => {
      switch (ev.kind) {
        case 'react:others:cardPlaced': {
          const targetId = (ev as any).meta?.target as string | undefined;
          const blocked = !!(ev as any).meta?.blocked;
          if (targetId) setReactionEmoji(targetId, blocked ? '❗️' : '💦', blocked ? 1800 : 1400);
          if (targetId) speak(targetId, blocked ? 'OTHER_OPP_BLOCK' : 'OTHER_OPP_NORMAL', setPlayerSpeeches);
          break;
        }
        case 'react:others:pass': {
          const by = (ev as any).by as string | undefined;
          if (by) setReactionEmoji(by, '💦', 2000);
          const targetId = (ev as any).meta?.target as string | undefined;
          let key: EventKey | undefined = (ev as any).meta?.key;
          if (targetId) {
            if (!key) {
              const observer = gameState?.players?.find(p => p.id === targetId);
              const maxPass = getMaxPassCount(gameState?.options || {});
              const observerPassCount = observer?.passCount || 0;
              key = observerPassCount >= maxPass ? 'OTHER_PASS_RISK' : 'OTHER_PASS_NORMAL';
            }
            speak(targetId, key as EventKey, setPlayerSpeeches);
          }
           case "react:self:multiChoice": {
           // … を表示（実装は他のself系と同じ。絵文字はUI側の既存マップに合わせる）
          setReactionEmoji(ev.playerId ?? state.players[state.currentPlayerIndex].id, "…");
          break;
         }

          break;
        }
        case 'react:others:passStreak': {
          (gameState?.players ?? [])
            .filter(p => !p.isFinished && !p.isEliminated)
            .forEach(p => setReactionEmoji(p.id, '❗️', 900));
          emitSpeech('PASS_STREAK_OBSERVED', null, 'all', setPlayerSpeeches);
          break;
        }
        case 'react:self:starter': {
          const pid = (ev as any).playerId as string;
          if (pid) setReactionEmoji(pid, '♫', 2400);
          emitSpeech('STARTER_DECIDED', pid, 'self', setPlayerSpeeches);
          break;
        }
        case 'react:self:finish': {
          const pid = (ev as any).playerId as string;
          const reason = (ev as any).reason as 'win' | 'foul' | 'passOver' | 'lastPlace';
          if (pid) setReactionEmoji(pid, reason === 'win' ? '🎉' : '💦', 3200);
          if (reason === 'win') emitSpeech('WINNER', pid, 'self', setPlayerSpeeches);
          else if (reason === 'lastPlace') emitSpeech('LAST_PLACE_CONFIRMED', pid, 'self', setPlayerSpeeches);
          else if (reason === 'foul') {
            emitSpeech('FINISH_FOUL', pid, 'self', setPlayerSpeeches);
            emitSpeech('SELF_ELIMINATED', pid, 'self', setPlayerSpeeches);
          } else if (reason === 'passOver') {
            emitSpeech('FINISH_PASS_OVER', pid, 'self', setPlayerSpeeches);
            emitSpeech('SELF_ELIMINATED', pid, 'self', setPlayerSpeeches);
          }
          break;
        }
        case 'react:others:massPlacement': {
          const loserId = (ev as any).loserId as string;
          (gameState?.players ?? [])
            .filter(p => p.id !== loserId)
            .forEach(p => setReactionEmoji(p.id, '💥', 1800));
          emitSpeech('ELIMINATION_MASS_PLACEMENT', loserId, 'others', setPlayerSpeeches);
          break;
        }
        case 'react:others:eliminated': {
          const pid = (ev as any).playerId as string;
          (gameState?.players ?? [])
            .filter(p => p.id !== pid)
            .forEach(p => setReactionEmoji(p.id, '💦', 1200));
          emitSpeech('OTHER_ELIMINATED', pid, 'others', setPlayerSpeeches);
          break;
        }
        case 'react:self:rank': {
          const pid = (ev as any).playerId as string;
          const key = (ev as any).meta?.key as EventKey;
          if (key) emitSpeech(key, pid, 'self', setPlayerSpeeches);
          break;
        }
        case 'react:others:lastPlace': {
          const last = (ev as any).playerId as string;
          if (last) emitSpeech('LAST_PLACE_CONFIRMED', last, 'self', setPlayerSpeeches);
          break;
        }
        case 'react:others:doomedDetected': {
          const targetId = (ev as any).meta?.target as string | undefined;
          if (targetId) speak(targetId, 'DOOMED_DETECTED', setPlayerSpeeches);
          break;
        }
        case 'react:self:doomedDetected': {
          const pid = (ev as any).playerId as string | undefined;
          if (pid) emitSpeech('DOOMED_DETECTED', pid, 'self', setPlayerSpeeches);
          break;
        }
        default:
          break;
      }
    });

    if (gameState) {
      setGameState(prev =>
        prev ? { ...prev, uiFx: { ...prev.uiFx, queue: [] } } : prev
      );
    }
  }, [gameState?.uiFx?.queue, setReactionEmoji, setPlayerSpeeches]);

  const selectCPUs = useCallback((cpuIds: string[]) => {
    setSelectedCPUs(cpuIds);
  }, []);

  const startGame = useCallback(() => {
    if (selectedCPUs.length !== 4) return;
    try {
      const newGameState = initializeGame(selectedCPUs, {});
      const validation = validateGameStateForAction(newGameState);
      if (!validation.isValid) {
        console.error('[startGame] invalid:', validation.error);
        return;
      }
      newGameState.options.debugFx = false;
      setGameState(newGameState);
      setIsPlaying(true);

      const initial: PlayerSpeechState = {};
      selectedCPUs.forEach(id => {
        initial[id] = {
          playerId: id,
          text: '…',
          timestamp: Date.now(),
          isProtected: false,
        };
      });
      setPlayerSpeeches(initial);
      setUIEffects({});
      currentGameState = newGameState;

      setTimeout(() => {
        const special = executeSpecialCombinationSpeech(selectedCPUs, setPlayerSpeeches);
        if (!special) {
          const speechUpdates: PlayerSpeechState = {};
          selectedCPUs.forEach(pid => {
            const message = speakByPlayerId(pid, 'EVT_PLAYERS_CONFIRMED');
            if (message) {
              speechUpdates[pid] = {
                playerId: pid,
                text: message,
                timestamp: Date.now(),
                isProtected: true,
              };
            }
          });
          if (Object.keys(speechUpdates).length > 0) {
            setPlayerSpeeches(prev => ({ ...prev, ...speechUpdates }));
            setTimeout(() => {
              setPlayerSpeeches(prev => {
                const updates = { ...prev };
                Object.keys(speechUpdates).forEach(pid => {
                  if (updates[pid]) updates[pid] = { ...updates[pid], isProtected: false };
                });
                return updates;
              });
            }, 3000);
          }
        }
        scheduleAutoStart();

        setTimeout(() => {
          emitSpeech('DEALT_HAND_EVAL', null, 'all', setPlayerSpeeches);
          emitSpeech('AUTO_PLACE_SEVENS', null, 'all', setPlayerSpeeches);
        }, 200);
      }, 100);
    } catch (e) {
      console.error('[startGame] failed:', e);
    }
  }, [selectedCPUs, scheduleAutoStart]);

  const resetGame = useCallback(() => {
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    autoPlayRef.current = null;
    if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
    autoStartTimerRef.current = null;

    setGameState(null);
    setIsPlaying(false);
    setPlayerSpeeches({});
    setUIEffects({});
    currentGameState = null;
  }, []);

  const playTurn = useCallback(() => {
    if (!gameState || gameState.gamePhase !== 'playing') return;

    const delay = gameSpeed.value >= 2000 ? 300 : gameSpeed.value >= 1000 ? 180 : 120;

    setGameState(prev => {
      if (!prev) return prev;
      const validation = validateGameStateForAction(prev);
      if (!validation.isValid) {
        console.error('[playTurn] invalid:', validation.error);
        return prev;
      }
      let s = beginTurn({ ...prev });
      const cur = s.players[s.currentPlayerIndex];
      if (!cur || cur.isEliminated || cur.isFinished) return advanceTurn(s);
      setThinking(cur.id);
      return s;
    });

    setTimeout(() => {
      setGameState(prev => {
        if (!prev || prev.gamePhase !== 'playing') return prev;
        const cur = prev.players[prev.currentPlayerIndex];
        if (!cur || cur.isEliminated || cur.isFinished) return advanceTurn(prev);

        const legalMoves = getLegalMoves(prev, cur.id) || [];
        if (legalMoves.length === 0) emitSpeech('NO_LEGAL_MOVES_DETECTED', cur.id, 'self', setPlayerSpeeches);
        else if (legalMoves.length >= 2) emitSpeech('MULTIPLE_LEGAL_MOVES', cur.id, 'self', setPlayerSpeeches);

        const maxPass = prev.options.maxPass ?? 3;
        const remainingPasses = maxPass - cur.passCount;
        if (remainingPasses <= 1) emitSpeech('PASS_WARNING', cur.id, 'self', setPlayerSpeeches);
        if (remainingPasses === 0 && legalMoves.length > 0) emitSpeech('MUST_PLAY_STATE', cur.id, 'self', setPlayerSpeeches);
        if (cur.passCount === maxPass && legalMoves.length === 0) emitSpeech('ELIM_RISK_WARNING', cur.id, 'self', setPlayerSpeeches);

        const action = decideCPUAction(prev, cur.id);

        if (action.type === 'pass') {
          speak(cur.id, legalMoves.length > 0 ? 'PASS_STRATEGIC' : 'PASS_DECIDED', setPlayerSpeeches);
        }

        const { state: newState, result } = applyAction(prev, action);

        if (action.type === 'place') {
          const meta = (newState as any).lastPlaced || {};
          let key: EventKey = 'PLAY_NORMAL';
          if (meta.wasNewEnd) key = 'OPEN_NEW_END';
          else if (meta.extendedEnd) key = 'EXTEND_EXISTING_END';
          else if (meta.unblockedSelf) key = 'UNBLOCK_SELF_SUIT';
          else if (meta.isReleaseBlock) key = 'RELEASE_BLOCK';
          speak(cur.id, key, setPlayerSpeeches);
          if (meta.completedAKtoA) speak(cur.id, 'AK_COMPLETE_TO_A', setPlayerSpeeches);
          if (meta.completedAKtoK) speak(cur.id, 'AK_COMPLETE_TO_K', setPlayerSpeeches);
        }

        if (result.nextPhase === 'turn:advance') return advanceTurn(newState);
        if (result.nextPhase === 'game:finished') return { ...newState, gamePhase: 'finished' };
        newState.actionLock = false;
        return advanceTurn(newState);
      });
    }, delay);
  }, [gameState, gameSpeed.value]);

  const autoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    const loop = () => {
      const st = currentGameState;
      if (!st || st.gamePhase !== 'playing') return;
      playTurn();
      autoPlayRef.current = setTimeout(loop, gameSpeed.value);
    };
    loop();
  }, [gameSpeed.value, playTurn]);

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
      if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
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
