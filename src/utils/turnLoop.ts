import {
  GameState,
  Player,
  Move,
  Card,
  ReactionEvent,
} from "../types/game";
import {
  getLegalMoves,
  removeCardFromHand,
  getMaxPassCount,
  placeLoserHandOnBoardWithMeta,
  dumpAllLosersHandsToBoard,
  finalizeBoardFill,
  placeCard,
  getRankOfPlayer,
  pushUiFx,
} from "./gameLogic";
import { recomputeAllLegalMoves } from "./recompute";
import { CPUActionSystem } from "./cpuActionSystem";


// turnLoop.ts（ファイル先頭付近）
const lastFxAt: Record<string, number> = {}; // `${kind}:${pid}` → ts
function queueFx(state: GameState, ev: ReactionEvent, cooldown = 900, prob = 1.0) {
  const pid =
    (ev as any).playerId ?? (ev as any).by ?? (ev as any).meta?.target ?? 'all';
  const key = `${ev.kind}:${pid}`;
  const now = Date.now();
  if (Math.random() > prob) return;
  if (lastFxAt[key] && now - lastFxAt[key] < cooldown) return;
  lastFxAt[key] = now;
  pushUiFx(state, ev);
}

// 0/1ベース混在の安全弁：内部が 0 でも 1 でも常に 1ベースで返す
const toOneBasedRank = (r: number | undefined | null): number | undefined => {
  if (typeof r !== "number") return undefined;
  return r >= 1 ? r : r + 1;
};



/**
 * 手番進行制御システム（Speech Dispatcher対応版）
 * - 観測者単位でのUIイベント発行
 * - BLOCK/NORMAL判定を配置前後で実行
 * - パス時の観測者別RISK判定
 * - 順位確定・手札枚数遷移・先手確定イベント追加
 * - ★終了系イベント最優先処理対応
 * - ★強化されたnullチェック
 */

export interface TurnResult {
  success: boolean;
  message: string;
  nextPhase:
    | "turn:begin"
    | "turn:awaitAction"
    | "turn:advance"
    | "game:finished";
  deferPaint?: boolean;
}

// 進捗ウォッチ（無限停滞の最後の保険）
let stallGuard = { hash: "", repeats: 0 };

// src/utils/turnLoop.ts（先頭付近）
const lastFxAt: Record<string, number> = {}; // `${kind}:${playerId}` → ts
function queueFx(state: GameState, ev: ReactionEvent, cooldown = 900, prob = 1.0) {
  const pid =
    (ev as any).playerId ?? (ev as any).by ?? (ev as any).meta?.target ?? 'all';
  const key = `${ev.kind}:${pid}`;
  const now = Date.now();
  if (Math.random() > prob) return;
  if (lastFxAt[key] && now - lastFxAt[key] < cooldown) return;
  lastFxAt[key] = now;
  pushUiFx(state, ev);
}


function snapshotHash(state: GameState): string {
  // 盤面・手札枚数・パスカウント・現在手番のみ（軽量）
  const boardSig = JSON.stringify(state.board);
  const counts = (state.players || []).map((p) => [
    p.id,
    p.handCount,
    p.passCount,
    p.isEliminated,
    p.isFinished,
  ]);
  return `${state.currentPlayerIndex}|${state.turn}|${boardSig}|${JSON.stringify(counts)}`;
}

/**
 * ★追加：終了系イベントを最優先で積む
 */
function unshiftUiFx(
  state: GameState,
  ev: ReactionEvent,
): void {
  if (!state.uiFx) state.uiFx = {};
  const prev = state.uiFx.queue ?? [];
  // ★参照を必ず更新：新しい配列を代入
  state.uiFx = { ...state.uiFx, queue: [ev, ...prev] };
}

/**
 * ★追加：GameStateの基本構造を検証
 */
function validateGameState(state: GameState): {
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

  return { isValid: true };
}

/**
 * 3人ドボン時の自動勝利判定
 */
function checkAutoWinCondition(state: GameState): {
  hasAutoWin: boolean;
  lastPlayer?: Player;
} {
  const validation = validateGameState(state);
  if (!validation.isValid) {
    console.error("[checkAutoWinCondition]", validation.error);
    return { hasAutoWin: false };
  }

  const remainingPlayers = state.players.filter(
    (p) => !p.isEliminated && !p.isFinished,
  );

  if (remainingPlayers.length === 1) {
    return {
      hasAutoWin: true,
      lastPlayer: remainingPlayers[0],
    };
  }

  return { hasAutoWin: false };
}

/**
 * 最後の1人を自動勝利させる処理
 */
function processAutoWin(
  state: GameState,
  lastPlayer: Player,
): void {
  // 順位記録（まだ記録されていない場合）
  if (!state.rankings.includes(lastPlayer.id)) {
    state.rankings.push(lastPlayer.id);
  }

  // プレイヤー状態を完了に設定
  lastPlayer.isFinished = true;
  lastPlayer.lastAction = "finish";
  lastPlayer.lastActionTurn = state.turnId;

  // 勝利理由を記録
  state.logs.push(
    `${lastPlayer.name}が最後の生存者として自動勝利しました！`,
  );

  // ★修正：残り1人の場合は最下位として扱う（4人制での最後の生存者）
  unshiftUiFx(state, {
    kind: "react:self:finish",
    playerId: lastPlayer.id,
    reason: "lastPlace",
  } as any);

  // ゲーム状態を終了に設定
  state.gamePhase = "finished";
  state.winner = state.rankings[0];

  // 最終スイープ
  finalizeBoardFill(state);

  console.log(
    `[AutoWin] ${lastPlayer.name} wins automatically (last survivor)`,
  );
}

/**
 * Before/After で観測者の選択肢が悪化したら BLOCK とみなす
 */
function didBlockObserver(
  beforeMoves: number,
  afterMoves: number,
): boolean {
  return afterMoves < beforeMoves;
}

/**
 * ターン開始処理（必ず'turn:awaitAction'で返す）
 */
export function beginTurn(state: GameState): GameState {
  // ★強化：早期検証
  const validation = validateGameState(state);
  if (!validation.isValid) {
    console.error("[beginTurn]", validation.error);
    return state;
  }

  state.turnId += 1;
  state.actionLock = false;

  // ターン開始時の自動勝利チェック
  const autoWinCheck = checkAutoWinCondition(state);
  if (autoWinCheck.hasAutoWin && autoWinCheck.lastPlayer) {
    processAutoWin(state, autoWinCheck.lastPlayer);
    return state;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  // 死活プレイヤーはすぐに次へ
  if (
    !currentPlayer ||
    currentPlayer.isEliminated ||
    currentPlayer.isFinished
  ) {
    console.debug(
      "[beginTurn] Player eliminated/finished, advancing immediately",
    );
    return advanceTurn(state);
  }

  console.debug("[beginTurn] Turn started", {
    turn: state.turn,
    player: currentPlayer.name,
    handCount: currentPlayer.hand.length,
  });

  // 必ず'turn:awaitAction'で返す
  return {
    ...state,
    turnPhase: "turn:awaitAction",
    actionLock: false,
  };
}

/**
 * アクション適用（観測者単位UIイベント対応）
 */
export function applyAction(
  state: GameState,
  action: Move,
): { state: GameState; result: TurnResult } {
  // ★強化：最初に完全な検証を実行
  console.debug("[applyAction] Starting validation", {
    hasState: !!state,
    hasPlayers: !!state?.players,
    playersLength: state?.players?.length,
    currentPlayerIndex: state?.currentPlayerIndex,
    action: action.type,
  });

  const validation = validateGameState(state);
  if (!validation.isValid) {
    console.error(
      "[applyAction] GameState validation failed:",
      validation.error,
    );
    return {
      state,
      result: {
        success: false,
        message: `ゲーム状態が無効です: ${validation.error}`,
        nextPhase: "turn:advance",
      },
    };
  }

  // 再入防止
  if (state.actionLock) {
    return {
      state,
      result: {
        success: false,
        message: "アクション実行中です",
        nextPhase: "turn:awaitAction",
      },
    };
  }

  if (state.turnPhase !== "turn:awaitAction") {
    return {
      state,
      result: {
        success: false,
        message: "アクション受付時間外です",
        nextPhase: "turn:awaitAction",
      },
    };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || action.playerId !== currentPlayer.id) {
    console.error("[applyAction] Player mismatch", {
      currentPlayer: currentPlayer?.id,
      actionPlayer: action.playerId,
      currentPlayerIndex: state.currentPlayerIndex,
    });
    return {
      state,
      result: {
        success: false,
        message: "プレイヤーが一致しません",
        nextPhase: "turn:awaitAction",
      },
    };
  }

  if (currentPlayer.isEliminated || currentPlayer.isFinished) {
    return {
      state,
      result: {
        success: false,
        message: "プレイヤーは既に脱落/完了しています",
        nextPhase: "turn:advance",
      },
    };
  }

  // ロック設定（1アクション保証）
  state.actionLock = true;

  try {
    if (action.type === "place" && action.card) {
      return handlePlayAction(state, action);
    } else if (action.type === "pass") {
      return handlePassAction(state, action);
    }

    // 不正なアクションタイプ
    state.actionLock = false;
    return {
      state,
      result: {
        success: false,
        message: "不正なアクション",
        nextPhase: "turn:advance",
      },
    };
  } catch (error) {
    // 例外発生時も確実にロック解除
    console.error("[applyAction] Exception occurred:", error);
    console.error("[applyAction] State at error:", {
      hasState: !!state,
      hasPlayers: !!state?.players,
      playersLength: state?.players?.length,
      currentPlayerIndex: state?.currentPlayerIndex,
      action,
    });
    state.actionLock = false;
    return {
      state,
      result: {
        success: false,
        message: "アクション処理中にエラーが発生しました",
        nextPhase: "turn:advance",
      },
    };
  }
}

/**
 * プレイアクション処理（観測者単位BLOCK判定付き）
 */
function handlePlayAction(
  state: GameState,
  action: Move,
): { state: GameState; result: TurnResult } {
  const { card, playerId } = action;
  if (!card) {
    state.actionLock = false;
    return {
      state,
      result: {
        success: false,
        message: "カードが指定されていません",
        nextPhase: "turn:advance",
      },
    };
  }

  // ★追加：プレイヤー検索前の検証
  if (!state.players || !Array.isArray(state.players)) {
    console.error("[handlePlayAction] Invalid players array");
    state.actionLock = false;
    return {
      state,
      result: {
        success: false,
        message: "プレイヤーデータが無効です",
        nextPhase: "turn:advance",
      },
    };
  }

  const playerIndex = state.players.findIndex(
    (p) => p.id === playerId,
  );
  if (playerIndex === -1) {
    state.actionLock = false;
    return {
      state,
      result: {
        success: false,
        message: "プレイヤーが見つかりません",
        nextPhase: "turn:advance",
      },
    };
  }

  const player = state.players[playerIndex];

  // パス連続カウントをリセット
  state.passStreak = 0;

  // 通常カードの合法手チェック
  const legalMoves = getLegalMoves(state, playerId) || [];
  const isLegal = legalMoves.some(
    (move) =>
      move.type === "place" &&
      move.card?.suit === card.suit &&
      move.card?.rank === card.rank,
  );

  if (!isLegal) {
    state.actionLock = false;
    return {
      state,
      result: {
        success: false,
        message: "不正な手です",
        nextPhase: "turn:advance",
      },
    };
  }

  // === before snapshot（観測者単位の合法手数を記録） ===
  const observers = state.players.filter(
    (p) => p.id !== playerId,
  );
  const beforeMovesMap = new Map<string, number>();
  observers.forEach((o) => {
    const n = getLegalMoves(state, o.id)?.length || 0;
    beforeMovesMap.set(o.id, n);
  });

  // ★先手確定チェック（♦7を初手に出した場合）
  if (
    state.turnId === 0 &&
    card.suit === "♦" &&
    card.rank === 7
  ) {
    console.debug(
      `[handlePlayAction] Starter decided: ${playerId} with ♦7`,
    );
    queueFx(state, { kind: "react:self:multiChoice", playerId } as any, 900, 0.7); // …
  }

  // カード配置実行
  placeCard(state, player, card);

  // 手札枚数遷移チェック（before配置前に記録）
  const prevCount = player.hand.length + 1; // placeCard後なので+1で復元
  const nowCount = player.hand.length;

  // 手札枚数遷移イベント（瞬間のみ発火）
  if (prevCount >= 3 && nowCount === 2) {
    console.debug(
      `[handlePlayAction] Hand count transition: ${playerId} 3->2`,
    );
    queueFx(state, { kind: "react:self:rank", playerId, meta: { key: "HAND_COUNT_ONE" } } as any, 1200, 1);
  }
  if (prevCount >= 2 && nowCount === 1) {
    console.debug(
      `[handlePlayAction] Hand count transition: ${playerId} 2->1`,
    );
    queueFx(state, { kind: "react:self:rank", playerId, meta: { key: "HAND_COUNT_ONE" } } as any, 1200, 1.0); // ❗️
  }

  // ★終了確定フラグ（終了確定後は一般イベントを抑止）
  let finishQueued = false;

  // 上がりチェック
  if (player.hand.length === 0) {
    player.isFinished = true;
    player.lastAction = "finish";
    player.lastActionTurn = state.turnId;

    // 順位記録
    if (!state.rankings.includes(playerId)) {
      state.rankings.push(playerId);
    }

    // 順位確定イベント（最優先）
    const rank0 = getRankOfPlayer(state, playerId);
    const rank1 = toOneBasedRank(rank0); // ★ 1ベースへ正規化
    console.debug(
      `[handlePlayAction] Player finished: ${playerId} rank=${rank1}`,
    );

    // ★ ここから（FINISH_* に meta.rank を必ず付与）
    if (rank1 === 1) {
      unshiftUiFx(state, {
        kind: "react:self:rank",
        playerId,
        meta: { key: "FINISH_1ST", rank: rank1 },
      } as any);
    } else if (rank1 === 2) {
      unshiftUiFx(state, {
        kind: "react:self:rank",
        playerId,
        meta: { key: "FINISH_2ND", rank: rank1 },
      } as any);
    } else if (rank1 === 3) {
      unshiftUiFx(state, {
        kind: "react:self:rank",
        playerId,
        meta: { key: "FINISH_3RD", rank: rank1 },
      } as any);
    } else if ((rank1 ?? 0) >= 4) {
      unshiftUiFx(state, {
        kind: "react:self:rank",
        playerId,
        meta: { key: "FINISH_OTHER", rank: rank1 },
      } as any);
    }
    // ★ ここまで

    // ★ 1ベースで最下位かどうかを判定（人数に依存）
    const totalPlayers = state.players.length;
    const isLastPlace = rank1 === totalPlayers;

    console.debug(
      `[handlePlayAction] Finish reason determination: ${playerId} rank=${rank1} isLastPlace=${isLastPlace}`,
    );

    // ★ react:self:finish にも rank を付与
    unshiftUiFx(state, {
      kind: "react:self:finish",
      playerId,
      reason: isLastPlace ? "lastPlace" : "win",
      meta: { rank: rank1 },
    } as any);
    finishQueued = true;


    state.logs.push(
      `${player.name}が${card.suit}${card.rank}を出して上がりました！`,
    );

    // 上がり後の自動勝利チェック
    const autoWinCheck = checkAutoWinCondition(state);
    if (autoWinCheck.hasAutoWin && autoWinCheck.lastPlayer) {
      processAutoWin(state, autoWinCheck.lastPlayer);

      state.actionLock = false;
      return {
        state,
        result: {
          success: true,
          message: "上がり！残り1人が自動勝利",
          nextPhase: "game:finished",
        },
      };
    }

    // ゲーム終了チェック
    const remainingPlayers = state.players.filter(
      (p) => !p.isFinished && !p.isEliminated,
    );
    if (remainingPlayers.length <= 1) {
      // 最終スイープ
      finalizeBoardFill(state);

      // 最下位確定（残り1名）
      if (remainingPlayers.length === 1) {
        const lastPlayer = remainingPlayers[0];
        console.debug(
          `[handlePlayAction] Last place confirmed: ${lastPlayer.id}`,
        );
      // ★ まだ finish していない最後の1名の順位は、既に確定した人数+1
      const lastRank1 = (state.rankings?.length ?? 0) + 1;

      unshiftUiFx(state, {
        kind: "react:others:lastPlace",
        playerId: lastPlayer.id,
        meta: { rank: lastRank1 }, // ★ 1ベース順位を付与
      } as any);

      }

      state.actionLock = false;
      return {
        state: {
          ...state,
          gamePhase: "finished",
          winner: state.rankings[0],
        },
        result: {
          success: true,
          message: "上がり！ゲーム終了",
          nextPhase: "game:finished",
        },
      };
    }

    state.actionLock = false;
    return {
      state,
      result: {
        success: true,
        message: "上がり！",
        nextPhase: "turn:advance",
      },
    };
  }

  // === after snapshot & 観測者ごとのBLOCK/NORMAL判定 ===
  // ★修正：終了確定後は一般イベントを抑止
  if (!finishQueued) {
    observers.forEach((o) => {
      const beforeN = beforeMovesMap.get(o.id) ?? 0;
      const afterN = getLegalMoves(state, o.id)?.length || 0;
      const blocked = didBlockObserver(beforeN, afterN);

      console.debug(
        `[handlePlayAction] Observer ${o.id}: ${beforeN} -> ${afterN} (blocked: ${blocked})`,
      );

      queueFx(state, { kind: "react:others:cardPlaced", by: playerId, card, meta: { target: o.id, blocked } } as any, 900, blocked ? 1.0 : 0.7); // 💦/❗️
    });
  }

  // プレイヤー状態更新
  player.lastAction = "play";
  player.lastActionTurn = state.turnId;

  state.moveHistory.push(action);
  state.logs.push(
    `${player.name}が${card.suit}${card.rank}を出しました`,
  );

  state.actionLock = false;
  return {
    state,
    result: {
      success: true,
      message: "カードを出しました",
      nextPhase: "turn:advance",
    },
  };
}

/**
 * パスアクション処理（観測者単位のRISK判定付き）
 */
function handlePassAction(
  state: GameState,
  action: Move,
): { state: GameState; result: TurnResult } {
  const { playerId } = action;

  // ★追加：プレイヤー検索前の検証
  if (!state.players || !Array.isArray(state.players)) {
    console.error("[handlePassAction] Invalid players array");
    state.actionLock = false;
    return {
      state,
      result: {
        success: false,
        message: "プレイヤーデータが無効です",
        nextPhase: "turn:advance",
      },
    };
  }

  const playerIndex = state.players.findIndex(
    (p) => p.id === playerId,
  );
  if (playerIndex === -1) {
    state.actionLock = false;
    return {
      state,
      result: {
        success: false,
        message: "プレイヤーが見つかりません",
        nextPhase: "turn:advance",
      },
    };
  }

  const player = state.players[playerIndex];
  const maxPass = getMaxPassCount(state.options);
  const eliminateOnFourthPass =
    state.options.eliminateOnFourthPass ?? true;

  // 強制出しチェック
  if (player.passCount >= maxPass) {
    const legalMoves = getLegalMoves(state, playerId) || [];
    const hasLegalMoves = legalMoves.some(
      (move) => move.type === "place",
    );

    if (hasLegalMoves) {
      state.actionLock = false;
      return {
        state,
        result: {
          success: false,
          message: "強制出しです",
          nextPhase: "turn:advance",
        },
      };
    }
  }

  // パス実行
  player.passCount += 1;
  player.lastAction = "pass";
  player.lastActionTurn = state.turnId;

  // パス連続カウント更新
  state.passStreak = (state.passStreak || 0) + 1;

  // ★終了確定フラグ（終了確定後は一般イベントを抑止）
  let finishQueued = false;

  // 4回目（= maxPass+1）で即脱落
  if (
    eliminateOnFourthPass &&
    player.passCount >= maxPass + 1
  ) {
    // ドボン：即脱落＋手札全放出
    player.isEliminated = true;
    player.lastAction = "eliminate";
    player.lastActionTurn = state.turnId;
    player.eliminateReason = "passOver";

    // メタデータ付き手札放出
    placeLoserHandOnBoardWithMeta(state, player);
    player.hand = [];
    player.handCount = 0;

    // ★修正：ドボンイベントを最優先で積む
    unshiftUiFx(state, {
      kind: "react:self:finish",
      playerId,
      reason: "passOver",
    } as any);
    finishQueued = true;

    // 脱落通知UIイベント（終了確定後なので抑止されない）
    unshiftUiFx(state, {
      kind: "react:others:eliminated",
      playerId,
    } as any);

    // 他の敗退者の手札もまとめて処理
    console.debug(`[handlePassAction] Before dumpAllLosersHandsToBoard`);
    dumpAllLosersHandsToBoard(state);

    // ★重要：ドボン展開後は必ず合法手を再計算
    console.debug(`[handlePassAction] Calling recomputeAllLegalMoves after mass placement`);
    recomputeAllLegalMoves(state);

    // 一括配置通知UIイベント
    unshiftUiFx(state, {
      kind: "react:others:massPlacement",
      loserId: playerId,
    } as any);

    state.moveHistory.push(action);
    state.logs.push(
      `${player.name}が4回目のパスで脱落し、手札を全て放出しました`,
    );

    // ドボン後の自動勝利チェック
    const autoWinCheck = checkAutoWinCondition(state);
    if (autoWinCheck.hasAutoWin && autoWinCheck.lastPlayer) {
      processAutoWin(state, autoWinCheck.lastPlayer);

      state.actionLock = false;
      return {
        state,
        result: {
          success: true,
          message: "ドボン脱落！残り1人が自動勝利",
          nextPhase: "game:finished",
        },
      };
    }

    // 全員敗退/完了チェック
    const remainingPlayers = state.players.filter(
      (p) => !p.isFinished && !p.isEliminated,
    );
    if (remainingPlayers.length === 0) {
      // 全員ドボン時の最終スイープ
      finalizeBoardFill(state);

      state.actionLock = false;
      return {
        state: { ...state, gamePhase: "finished" },
        result: {
          success: true,
          message: "全員脱落でゲーム終了",
          nextPhase: "game:finished",
        },
      };
    }

    state.actionLock = false;
    return {
      state,
      result: {
        success: true,
        message: "4回目パスで脱落",
        nextPhase: "turn:advance",
      },
    };
  }

  // === 観測者単位のパス反応（NORMAL/RISK判定） ===
  // ★修正：終了確定後は一般イベントを抑止
  if (!finishQueued) {
    state.players.forEach((o) => {
      if (o.id === playerId) return; // 自分は除く
      const key =
        o.passCount >= maxPass
          ? "OTHER_PASS_RISK"
          : "OTHER_PASS_NORMAL";
      console.debug(
        `[handlePassAction] Pass reaction: ${o.id} -> ${key} (passCount: ${o.passCount}/${maxPass})`,
      );
      queueFx(state, { kind: "react:others:pass", by: playerId, meta: { target: o.id } } as any, 900, 1);
    });

    // パス連続発生の通知
    if (state.passStreak >= 2) {
      console.debug(
        `[handlePassAction] Pass streak: ${state.passStreak}`,
      );
      queueFx(state, { kind: "react:others:passStreak", count: state.passStreak }, 900, 1.0); // 💦
    }
  }

  state.moveHistory.push(action);
  state.logs.push(
    `${player.name}がパスしました (${player.passCount}/${maxPass})`,
  );

  state.actionLock = false;
  return {
    state,
    result: {
      success: true,
      message: "パスしました",
      nextPhase: "turn:advance",
    },
  };
}

/**
 * ターン進行（進捗ウォッチ付き安全化版＋自動勝利チェック）
 */
export function advanceTurn(state: GameState): GameState {
  console.debug("[advanceTurn] Starting", {
    currentPlayer: state.currentPlayerIndex,
    turn: state.turn,
    phase: state.turnPhase,
  });

  // ★強化：早期検証
  const validation = validateGameState(state);
  if (!validation.isValid) {
    console.error("[advanceTurn]", validation.error);
    return state;
  }

  // 進捗監視
  const h = snapshotHash(state);
  if (stallGuard.hash === h) {
    stallGuard.repeats++;
    if (stallGuard.repeats >= 4) {
      // 4連続で状態が一切動かない → 強制パス
      const p = state.players[state.currentPlayerIndex];
      if (p) {
        p.passCount = (p.passCount ?? 0) + 1;
        state.logs.push(
          `[stallGuard] ${p.name} を強制パス扱い`,
        );
        console.warn(
          "Stall guard activated: forcing pass for",
          p.name,
        );
      }
      stallGuard = { hash: "", repeats: 0 }; // リセット
    }
  } else {
    stallGuard = { hash: h, repeats: 0 };
  }

  // アクションロック解除
  state.actionLock = false;

  // ターン進行前の自動勝利チェック
  const autoWinCheck = checkAutoWinCondition(state);
  if (autoWinCheck.hasAutoWin && autoWinCheck.lastPlayer) {
    processAutoWin(state, autoWinCheck.lastPlayer);
    return state;
  }

  // 次のプレイヤーを探す（生存者のみ）
  let nextPlayerIndex =
    (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;

  while (attempts < state.players.length) {
    const nextPlayer = state.players[nextPlayerIndex];
    if (
      nextPlayer &&
      !nextPlayer.isEliminated &&
      !nextPlayer.isFinished
    ) {
      break;
    }
    nextPlayerIndex =
      (nextPlayerIndex + 1) % state.players.length;
    attempts++;
  }

  // 全員脱落/完了チェック
  if (attempts >= state.players.length) {
    // 全員脱落時の最終スイープ
    finalizeBoardFill(state);

    console.debug(
      "[advanceTurn] All players eliminated/finished",
    );
    return {
      ...state,
      gamePhase: "finished",
      turnPhase: "turn:begin",
    };
  }

  // ★修正：advanceTurn内での「…」表示は削除（useSevensBridgeで直接制御）
  // 次プレイヤーの「…」表示はuseSevensBridge.playTurnで直接実行される

  // ★追加：ターン進行時も次プレイヤーの合法手を確実に更新
  const nextPlayer = state.players[nextPlayerIndex];
  if (nextPlayer && !nextPlayer.isEliminated && !nextPlayer.isFinished) {
    if (!state.legalMovesCache) state.legalMovesCache = {};
    const legalMoves = getLegalMoves(state, nextPlayer.id);
    state.legalMovesCache[nextPlayer.id] = legalMoves || [];
    console.debug(`[advanceTurn] Updated legal moves for next player ${nextPlayer.id}: ${legalMoves?.length || 0} moves:`, 
      (legalMoves || []).map(m => `${m.card?.suit}${m.card?.rank}`));
  }

  const result = {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    turn: state.turn + 1,
    turnPhase: "turn:begin" as const,
  };

  console.debug("[advanceTurn] Advanced to", {
    nextPlayer: result.players[nextPlayerIndex].name,
    turn: result.turn,
  });

  return result;
}

/**
 * CPU行動決定（CPUActionSystemに統一）
 */
export function decideCPUAction(
  state: GameState,
  playerId: string,
): Move {
  const decision = CPUActionSystem.decideAction(
    state,
    playerId,
  );
  if (decision.action === "play" && decision.move)
    return decision.move;
  return { type: "pass", playerId };
}