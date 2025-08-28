import {
  GameState,
  Player,
  Card,
  BoardState,
  LegalMove,
} from "../types/game";
import { getCPUPlayer } from "../data/cpuPlayers";

/**
 * CPU個性システム（パス傾向調整版）
 * - パス過多を解決：基本的には「出せるなら出す」原則
 * - 真に戦略的な場面でのみパス
 * - キャラごとの明確な差別化
 */

export interface PersonalityTraits {
  aggressiveness: number; // 攻撃性 (0-1)
  conservativeness: number; // 保守性 (0-1)
  riskTolerance: number; // リスク許容度 (0-1)
  reading: number; // 場読み能力 (0-1)

  // ★調整：4つの主要性格パラメータ（パス傾向大幅削減）
  blockTendency: number; // ブロック傾向。高いと他人を止めたがる (0-1)
  passTendency: number; // パス傾向。大幅削減して健全化 (0-0.4)
  riskAverse: number; // リスク回避傾向。高いとパス制限を意識する (0-1)
  handHoarding: number; // 強カードを手札に抱えがち (0-1)

  // 既存の戦略的パス関連
  strategicPass: number; // 戦略的パス全体の嗜好 (0-1)
  spitePass: number; // 相手瀕死時に"待つ"嗜好 (0-1)
  blockHoldBias: number; // 自分がブロックしている端を保持 (0-1)
}

export interface JokerContext {
  isJokerMove: boolean;
  ownerHandCount: number;
  ownerId: string | null;
  target: { suit: string; rank: number } | null;
}

export interface GameContext {
  state: GameState;
  player: Player;
  passCount: number;
  maxPass: number;
  handCount: number;
  opponents: Player[];
}

// ★基本パスしないキャラ
const NO_PASS_CHARS: Record<string, boolean> = {
  "cpu-01": true, // 1主 - 基本出す
  "cpu-02": true, // 2主 - 基本出す
  "cpu-03": true, // 3主 - 基本出す
  "cpu-09": true, // 9主 - 基本出す
};

// ★気まぐれパスキャラ
const WHIMSICAL_CHARS: Record<string, boolean> = {
  "cpu-04": true, // 4主 - 気まぐれ
  "cpu-06": true, // 6主 - 気まぐれ
};

// ★戦略的パスキャラ（いじわる系）
const STRATEGIC_CHARS: Record<string, boolean> = {
  "cpu-05": true, // 5主 - 戦略的
  "cpu-07": true, // 7主 - 戦略的
  "cpu-08": true, // 8主 - 戦略的
  "cpu-10": true, // 10主 - 戦略的
  "cpu-11": true, // 11主 - 戦略的
};

// ★個性値調整関数（パス傾向を大幅削減）
function tunePersonality(
  base: Partial<PersonalityTraits>,
  id: string,
): PersonalityTraits {
  // デフォルト値設定
  const p: PersonalityTraits = {
    aggressiveness: base.aggressiveness ?? 0.5,
    conservativeness: base.conservativeness ?? 0.5,
    riskTolerance: base.riskTolerance ?? 0.5,
    reading: base.reading ?? 0.5,
    blockTendency: base.blockTendency ?? 0.5,
    passTendency: base.passTendency ?? 0.2, // ★デフォルトを大幅削減
    riskAverse: base.riskAverse ?? 0.5,
    handHoarding: base.handHoarding ?? 0.5,
    strategicPass: base.strategicPass ?? 0.5,
    spitePass: base.spitePass ?? 0.4,
    blockHoldBias: base.blockHoldBias ?? 0.5,
  };

  // ★基本パスしないキャラ
  if (NO_PASS_CHARS[id]) {
    p.passTendency = 0.1; // 極小
    p.strategicPass = 0.2; // 戦略的パスも控えめ
  }

  // ★気まぐれパスキャラ
  if (WHIMSICAL_CHARS[id]) {
    p.passTendency = 0.3; // 気まぐれ程度
    p.strategicPass = 0.4; // 少し戦略的
  }

  // ★戦略的パスキャラ（いじわる系）
  if (STRATEGIC_CHARS[id]) {
    p.passTendency = 0.2; // 基本は出すが
    p.strategicPass = 0.6; // 戦略的には待つ
    p.spitePass = 0.5; // 意地悪待ち
    p.blockTendency = Math.min(1, p.blockTendency + 0.3); // ブロック好き
  }

  return p;
}

// ★キャラ別個性設定（パス傾向調整版）
export const PERSONALITIES: Record<string, PersonalityTraits> =
  {
    // 1主: 基本出す・保守的
    "cpu-01": tunePersonality(
      {
        aggressiveness: 0.2,
        conservativeness: 0.9,
        riskTolerance: 0.2,
        reading: 0.7,
        blockTendency: 0.3,
        passTendency: 0.1, // ★極小
        riskAverse: 0.8,
        handHoarding: 0.6,
        strategicPass: 0.2,
        spitePass: 0.1,
        blockHoldBias: 0.7,
      },
      "cpu-01",
    ),

    // 2主: 基本出す・やや慎重
    "cpu-02": tunePersonality(
      {
        aggressiveness: 0.3,
        conservativeness: 0.8,
        riskTolerance: 0.3,
        reading: 0.6,
        blockTendency: 0.4,
        passTendency: 0.1, // ★極小
        riskAverse: 0.7,
        handHoarding: 0.5,
        strategicPass: 0.2,
        spitePass: 0.1,
        blockHoldBias: 0.6,
      },
      "cpu-02",
    ),

    // 3主: 基本出す・ブロック好き
    "cpu-03": tunePersonality(
      {
        aggressiveness: 0.8,
        conservativeness: 0.2,
        riskTolerance: 0.9,
        reading: 0.5,
        blockTendency: 0.9, // ブロック狂
        passTendency: 0.1, // ★極小
        riskAverse: 0.1,
        handHoarding: 0.4,
        strategicPass: 0.2,
        spitePass: 0.1,
        blockHoldBias: 0.8,
      },
      "cpu-03",
    ),

    // 4主: 気まぐれパス・分析好き
    "cpu-04": tunePersonality(
      {
        aggressiveness: 0.4,
        conservativeness: 0.7,
        riskTolerance: 0.5,
        reading: 0.9,
        blockTendency: 0.5,
        passTendency: 0.3, // ★気まぐれ
        riskAverse: 0.6,
        handHoarding: 0.5,
        strategicPass: 0.4,
        spitePass: 0.3,
        blockHoldBias: 0.5,
      },
      "cpu-04",
    ),

    // 5主: 戦略的・ブロック好き
    "cpu-05": tunePersonality(
      {
        aggressiveness: 0.6,
        conservativeness: 0.5,
        riskTolerance: 0.7,
        reading: 0.7,
        blockTendency: 0.8,
        passTendency: 0.2, // ★戦略的にのみ
        riskAverse: 0.3,
        handHoarding: 0.5,
        strategicPass: 0.6,
        spitePass: 0.5,
        blockHoldBias: 0.6,
      },
      "cpu-05",
    ),

    // 6主: 気まぐれパス・積極的
    "cpu-06": tunePersonality(
      {
        aggressiveness: 0.8,
        conservativeness: 0.2,
        riskTolerance: 0.9,
        reading: 0.6,
        blockTendency: 0.4,
        passTendency: 0.3, // ★気まぐれ
        riskAverse: 0.2,
        handHoarding: 0.7,
        strategicPass: 0.4,
        spitePass: 0.3,
        blockHoldBias: 0.4,
      },
      "cpu-06",
    ),

    // 7主: 戦略的・超攻撃的
    "cpu-07": tunePersonality(
      {
        aggressiveness: 1.0,
        conservativeness: 0.0,
        riskTolerance: 1.0,
        reading: 0.3,
        blockTendency: 0.9,
        passTendency: 0.2, // ★戦略的にのみ
        riskAverse: 0.0,
        handHoarding: 0.2,
        strategicPass: 0.6,
        spitePass: 0.4,
        blockHoldBias: 0.7,
      },
      "cpu-07",
    ),

    // 8主: 戦略的・高読み
    "cpu-08": tunePersonality(
      {
        aggressiveness: 0.5,
        conservativeness: 0.6,
        riskTolerance: 0.6,
        reading: 0.9,
        blockTendency: 0.9,
        passTendency: 0.3, // ★戦略的にのみ
        riskAverse: 0.4,
        handHoarding: 0.6,
        strategicPass: 0.7, // 高戦略
        spitePass: 0.6, // 意地悪
        blockHoldBias: 0.7,
      },
      "cpu-08",
    ),

    // 9主: 基本出す・積極的
    "cpu-09": tunePersonality(
      {
        aggressiveness: 0.9,
        conservativeness: 0.1,
        riskTolerance: 0.9,
        reading: 0.5,
        blockTendency: 0.3,
        passTendency: 0.1, // ★極小
        riskAverse: 0.2,
        handHoarding: 0.6,
        strategicPass: 0.2,
        spitePass: 0.1,
        blockHoldBias: 0.3,
      },
      "cpu-09",
    ),

    // 10主: 戦略的・抱え込み
    "cpu-10": tunePersonality(
      {
        aggressiveness: 0.9,
        conservativeness: 0.1,
        riskTolerance: 1.0,
        reading: 0.2,
        blockTendency: 0.7,
        passTendency: 0.2, // ★戦略的にのみ
        riskAverse: 0.0,
        handHoarding: 0.9, // 超抱え込み
        strategicPass: 0.6,
        spitePass: 0.4,
        blockHoldBias: 0.6,
      },
      "cpu-10",
    ),

    // 11主: 戦略的・ギャンブラー
    "cpu-11": tunePersonality(
      {
        aggressiveness: 0.8,
        conservativeness: 0.1,
        riskTolerance: 1.0,
        reading: 0.4,
        blockTendency: 0.8,
        passTendency: 0.2, // ★戦略的にのみ
        riskAverse: 0.0,
        handHoarding: 0.3,
        strategicPass: 0.6,
        spitePass: 0.4,
        blockHoldBias: 0.5,
      },
      "cpu-11",
    ),
  };

/**
 * プレイヤーIDから個性を取得
 */
export function getPersonality(
  playerId: string,
): PersonalityTraits {
  const personality = PERSONALITIES[playerId];
  if (!personality) {
    console.warn(
      `No personality found for player ${playerId}, using default`,
    );
    return tunePersonality(
      {
        aggressiveness: 0.5,
        conservativeness: 0.5,
        riskTolerance: 0.5,
        reading: 0.5,
        blockTendency: 0.5,
        passTendency: 0.2, // ★デフォルトも削減
        riskAverse: 0.5,
        handHoarding: 0.5,
        strategicPass: 0.5,
        spitePass: 0.4,
        blockHoldBias: 0.5,
      },
      playerId,
    );
  }
  return personality;
}

/**
 * ★調整：手の評価関数（ブロック重視、パス抑制）
 */
export function evaluateMove(
  move: LegalMove,
  hand: Card[],
  board: BoardState,
  context?: {
    joker?: JokerContext;
    game?: GameContext;
    playerId?: string;
  },
): number {
  const playerId =
    context?.game?.player.id || context?.playerId || "cpu-01";
  const personality = getPersonality(playerId);

  let score = 0.7; // ★基準点を上げて出しやすく

  // ★性格による評価（パス抑制方向に調整）

  // 1. ブロック傾向の反映（変更なし）
  if (isBlockingMove(move, board, context?.game)) {
    score += personality.blockTendency * 0.6;

    if (STRATEGIC_CHARS[playerId]) {
      score += 0.3; // いじわるキャラはブロック加点
    }
  }

  // 2. 新端開放への反応（軽減）
  if (move.opensNewEnd) {
    score -= 0.2 * (1 - personality.aggressiveness); // 減点を軽減
    score -= 0.1 * personality.riskAverse; // 減点を軽減
  }

  // 3. ブロック解放への反応（軽減）
  if (move.wouldReleaseMyBlock) {
    score -= 0.3 * personality.blockHoldBias; // 減点を軽減
    score -= 0.1 * personality.riskAverse; // 減点を軽減
  }

  // 4. 手札抱え込み傾向（軽減）
  if (isValuableCard(move.card, hand, board)) {
    score -= personality.handHoarding * 0.3; // 減点を大幅軽減

    if (STRATEGIC_CHARS[playerId]) {
      score -= 0.1; // いじわるキャラも軽減
    }
  }

  // 5. リスク回避（軽減）
  if (isRiskyMove(move, board, hand)) {
    score -= personality.riskAverse * 0.3; // 減点を大幅軽減
    score += personality.riskTolerance * 0.2; // 加点は維持
  }

  // ★新規：基本的に出すことへのボーナス
  score += 0.2; // 出すことの基本価値

  // 通常カード評価
  score += evaluateNormalMove(
    move,
    hand,
    board,
    personality,
    context?.game,
  );

  return score;
}

/**
 * ★新強化：状況推論ベースの戦略的パス判定（スコア式）
 */
export function shouldMakeStrategicPass(
  gameState: GameState,
  player: Player,
  validMoves: any[],
): boolean {
  const personality = getPersonality(player.id);
  const maxPass = gameState.options.maxPass ?? 3;
  const remainingPasses = maxPass - player.passCount;

  // 0. 残り0パス → パス不可（強制出し）
  if (remainingPasses <= 0) return false;

  // ★1. キャラタイプ別の基本判定
  if (NO_PASS_CHARS[player.id]) {
    // 基本パスしないキャラ：極めて限定的な条件でのみ
    return false; // 基本的にパスしない
  }

  if (WHIMSICAL_CHARS[player.id]) {
    // 気まぐれキャラ：低確率でランダムパス
    if (remainingPasses >= 2 && Math.random() < 0.15) {
      // 15%の確率
      return true;
    }
  }

  // ★2. 戦略的キャラ（3,5,8,10）のスコア式判定
  if (STRATEGIC_CHARS[player.id]) {
    const characterCode = player.id
      .replace("cpu-0", "")
      .replace("cpu-", "");

    // スコア式戦略パス判定を試行
    try {
      return shouldMakeStrategicPassScoreBased(
        gameState,
        player,
        characterCode,
      );
    } catch (error) {
      console.warn(
        `[CPU] Strategic pass score calculation failed for ${player.id}:`,
        error,
      );
      // フォールバック：従来ロジック
    }
  }

  if (!STRATEGIC_CHARS[player.id]) {
    // 戦略的でないキャラはここで終了
    return false;
  }

  // ★3. フォールバック：従来の戦略的判定（軽量版）

  // 3-1. 新端しか開かない & リスク回避 → 待つ
  const opensOnlyNewEnds = validMoves.every(
    (m) => m.opensNewEnd,
  );
  if (opensOnlyNewEnds && personality.riskAverse > 0.6) {
    return true;
  }

  // 3-2. 自分のブロックを解放 & ブロック保持派 → 待つ
  const wouldReleaseBlock = validMoves.some(
    (m) => m.wouldReleaseMyBlock,
  );
  if (wouldReleaseBlock && personality.blockHoldBias > 0.7) {
    return true;
  }

  // 3-3. 相手瀕死時の意地悪待ち（確率大幅削減）
  const opponents = gameState.players.filter(
    (p) =>
      p.id !== player.id && !p.isEliminated && !p.isFinished,
  );
  const someoneNearFinish = opponents.some(
    (p) => p.handCount <= 2 || p.passCount >= maxPass - 1,
  );

  if (someoneNearFinish && remainingPasses >= 2) {
    const waitChance = personality.spitePass * 0.2; // 大幅削減：最大20%
    return Math.random() < waitChance;
  }

  // 3-4. 手札抱え込み派の贅沢パス（条件厳格化）
  if (
    personality.handHoarding > 0.8 &&
    player.handCount >= 7 &&
    remainingPasses >= 2
  ) {
    return Math.random() < 0.1; // 10%の確率
  }

  return false;
}

/**
 * ★新機能：スコア式戦略的パス判定
 */
function shouldMakeStrategicPassScoreBased(
  state: GameState,
  player: Player,
  characterCode: string,
): boolean {
  // ストラテジーモジュールを直接インポート
  try {
    // 動的インポートを使ってモジュールを読み込み
    import("./strategy/personas")
      .then((personasModule) => {
        import("./strategy/features").then((featuresModule) => {
          return executeStrategicPassLogic(
            state,
            player,
            characterCode,
            personasModule,
            featuresModule,
          );
        });
      })
      .catch((error) => {
        console.warn(
          `[CPU] Strategic pass features not available, falling back to simple logic:`,
          error,
        );
      });

    // 同期的な簡易実装にフォールバック
    return executeSimpleStrategicPass(
      state,
      player,
      characterCode,
    );
  } catch (error) {
    console.warn(
      `[CPU] Strategic pass features not available, falling back to simple logic:`,
      error,
    );
    return false;
  }
}

/**
 * ★簡易版ストラテジック判定（strategy モジュール不使用）
 */
function executeSimpleStrategicPass(
  state: GameState,
  player: Player,
  characterCode: string,
): boolean {
  // 戦略的キャラ（3,5,8,10）の基本的なパス判定
  const strategicChars = ["3", "5", "8", "10"];
  if (!strategicChars.includes(characterCode)) return false;

  const maxPass = state.options.maxPass ?? 3;
  const remainingPasses = maxPass - player.passCount;

  // 残りパス1以下ではパスしない
  if (remainingPasses <= 1) return false;

  const opponents = state.players.filter(
    (p) =>
      p.id !== player.id && !p.isEliminated && !p.isFinished,
  );

  // 相手に脅威がいる場合の戦略的パス
  const threatExists = opponents.some((p) => p.handCount <= 2);

  // キャラ別の基本確率
  let baseChance = 0;
  switch (characterCode) {
    case "3":
      baseChance = threatExists ? 0.25 : 0.15;
      break; // 冷静
    case "5":
      baseChance = threatExists ? 0.2 : 0.12;
      break; // バランス
    case "8":
      baseChance = threatExists ? 0.3 : 0.18;
      break; // 様子見
    case "10":
      baseChance = threatExists ? 0.22 : 0.1;
      break; // ブロッカー
  }

  // 連続パス抑制
  if (player.lastAction === "pass") {
    baseChance *= 0.5;
  }

  const shouldPass = Math.random() < baseChance;

  if (shouldPass) {
    console.debug(
      `[CPU] Simple strategic pass: ${player.id} (${characterCode}) chance=${baseChance.toFixed(2)} threat=${threatExists}`,
    );
  }

  return shouldPass;
}

/**
 * ★フル機能版ストラテジック判定（非同期）
 */
function executeStrategicPassLogic(
  state: GameState,
  player: Player,
  characterCode: string,
  personasModule: any,
  featuresModule: any,
): boolean {
  const persona =
    personasModule.getPersonaWeights(characterCode);
  if (!persona) return false;

  const ctx = featuresModule.buildStrategicContext(
    state,
    player,
  );

  // --- 特徴量 ---
  const fOpp = featuresModule.featOpponentThreat(ctx);
  const fLane = featuresModule.featLanePressure(ctx, state);
  const fBL = featuresModule.featBlockLeverage(state, ctx);
  const fSafe = featuresModule.featSelfSafety(state, ctx);
  const fHand = featuresModule.featHandShape(player);
  const passCost = featuresModule.featPassResourceCost(ctx);

  // 手番距離
  const tempo = Math.max(
    0,
    1.2 - 0.2 * ctx.turnDistanceToThreat,
  );

  // --- スコア合成 ---
  let passScore =
    persona.oppThreat * fOpp +
    persona.lanePressure * fLane +
    persona.blockLeverage * fBL +
    persona.selfSafety * fSafe +
    persona.handShape * fHand +
    persona.tempoBias * tempo +
    persona.baseBias;

  const playScore = estimatePlayOpportunityCost(state, player);
  let decisionScore = passScore - playScore - passCost;

  // 連続パス減衰
  if (player.lastAction === "pass") {
    decisionScore *= persona.maxConsecutiveDamp;
  }

  const ok = decisionScore >= persona.threshold;

  console.debug(
    `[CPU] SP(pass) p=${player.id} fOpp=${fOpp.toFixed(2)} fLane=${fLane.toFixed(2)} fBL=${fBL.toFixed(2)} fSafe=${fSafe.toFixed(2)} fHand=${fHand.toFixed(2)} tempo=${tempo.toFixed(2)} play=${playScore.toFixed(2)} cost=${passCost.toFixed(2)} -> score=${decisionScore.toFixed(2)} thr=${persona.threshold} => ${ok}`,
  );
  return ok;
}

// 近似：自分の最良手を打つと相手の合法手がどれだけ増えるか等で評価
function estimatePlayOpportunityCost(
  state: GameState,
  player: Player,
): number {
  // 既存の getLegalMoves を使用して簡易推定
  const { getLegalMoves } = require("./gameLogic");
  const legalMoves = getLegalMoves(state, player.id) || [];
  if (legalMoves.length === 0) return 0;

  // 新端開放やブロック解放がある場合は機会損失大
  const opensNewEnds = legalMoves.some(
    (m: any) => m.opensNewEnd,
  );
  const releasesBlock = legalMoves.some(
    (m: any) => m.wouldReleaseMyBlock,
  );

  let cost = opensNewEnds ? 0.5 : 0;
  cost += releasesBlock ? 0.8 : 0;

  return Math.min(2.0, Math.max(0, cost));
}

/**
 * ブロック系の手かどうか判定
 */
function isBlockingMove(
  move: LegalMove,
  board: BoardState,
  gameContext?: GameContext,
): boolean {
  const { suit, card } = move;
  const position = card.rank - 1;

  // 端を開く手はブロック系
  if (position === 0 || position === 12) {
    return true;
  }

  // キーポジション（6, 8等）はブロック効果あり
  if (position === 5 || position === 7) {
    // 6, 8
    return true;
  }

  // 相手が困る位置（相手の手札から推測）
  if (gameContext) {
    // 簡易版：相手の手札が少ない時は全てブロック効果とみなす
    const hasLowOpponent = gameContext.opponents.some(
      (opp) => opp.handCount <= 3,
    );
    if (hasLowOpponent) {
      return true;
    }
  }

  return false;
}

/**
 * 貴重カードかどうか判定
 */
function isValuableCard(
  card: Card,
  hand: Card[],
  board: BoardState,
): boolean {
  const position = card.rank - 1;

  // A, Kは貴重
  if (position === 0 || position === 12) {
    return true;
  }

  // 同スートで数少ない場合は貴重
  const sameSuitCount = hand.filter(
    (c) => c.suit === card.suit,
  ).length;
  if (sameSuitCount <= 2) {
    return true;
  }

  // 7の隣（6, 8）は貴重
  if (position === 5 || position === 7) {
    return true;
  }

  return false;
}

/**
 * 通常カード評価（既存ロジック維持）
 */
function evaluateNormalMove(
  move: LegalMove,
  hand: Card[],
  board: BoardState,
  personality: PersonalityTraits,
  gameContext?: GameContext,
): number {
  let score = 0;

  // 基本的な手の価値
  score += 0.3;

  // 攻撃性による評価
  if (isAggressiveMove(move, board)) {
    score += personality.aggressiveness * 0.4;
  }

  // 保守性による評価
  if (isConservativeMove(move, board)) {
    score += personality.conservativeness * 0.3;
  }

  // リスク許容度
  if (isRiskyMove(move, board, hand)) {
    score +=
      personality.riskTolerance * 0.3 -
      (1 - personality.riskTolerance) * 0.2;
  }

  // 場読みによる評価
  if (gameContext) {
    const contextScore = evaluateGameContext(
      move,
      gameContext,
      personality,
    );
    score += contextScore;
  }

  // 連鎖可能性
  const chainPotential = calculateChainPotential(move, hand);
  score += chainPotential * 0.2;

  return score;
}

/**
 * 攻撃的な手かどうか判定
 */
function isAggressiveMove(
  move: LegalMove,
  board: BoardState,
): boolean {
  const { suit, card } = move;
  const row = board[suit];
  const position = card.rank - 1;

  // 端を開く手は攻撃的
  if (position === 0 || position === 12) {
    return true;
  }

  // 相手の連鎖を断つ手
  const hasGaps = row.some((cell) => cell === "GAP");
  if (hasGaps) {
    return true;
  }

  return false;
}

/**
 * 保守的な手かどうか判定
 */
function isConservativeMove(
  move: LegalMove,
  board: BoardState,
): boolean {
  const { suit, card } = move;
  const position = card.rank - 1;

  // 7の近くは保守的
  if (Math.abs(position - 6) <= 2) {
    return true;
  }

  // 既存の連続に追加する手
  const row = board[suit];
  const hasAdjacent =
    (position > 0 && row[position - 1] !== null) ||
    (position < 12 && row[position + 1] !== null);

  return hasAdjacent;
}

/**
 * リスキーな手かどうか判定
 */
function isRiskyMove(
  move: LegalMove,
  board: BoardState,
  hand: Card[],
): boolean {
  const { suit, card } = move;
  const position = card.rank - 1;

  // 端札はリスキー
  if (position === 0 || position === 12) {
    return true;
  }

  // 手札が少ない時の温存札を出すのはリスキー
  if (hand.length <= 4) {
    const sameSuitCards = hand.filter((c) => c.suit === suit);
    if (sameSuitCards.length <= 2) {
      return true;
    }
  }

  return false;
}

/**
 * ゲーム文脈による評価
 */
function evaluateGameContext(
  move: LegalMove,
  context: GameContext,
  personality: PersonalityTraits,
): number {
  let score = 0;

  // 手札残り枚数による調整
  if (context.handCount <= 3) {
    score += 0.3; // 残り少ない時は積極的（増加）
  } else if (context.handCount >= 8) {
    score += 0.2 * personality.aggressiveness; // 多い時も出す方向
  }

  // パス回数による調整
  const remainingPasses = context.maxPass - context.passCount;
  if (remainingPasses <= 1) {
    score += 0.4; // パス残り少ない時は強く出す方向
  }

  // 他プレイヤーの状況を考慮
  const dangerousOpponents = context.opponents.filter(
    (opp) => opp.handCount <= 3,
  );
  if (dangerousOpponents.length > 0) {
    // 上がりそうな相手がいる時は急ぐ
    score += 0.2; // 基本的に急ぐ
    score += personality.reading * 0.1;

    // ★い��わる度による減点を大幅軽減
    if (personality.spitePass > 0.7) {
      score -= 0.05 * personality.spitePass; // 大幅軽減
    }
  }

  return score;
}

/**
 * 連鎖可能性の計算
 */
function calculateChainPotential(
  move: LegalMove,
  hand: Card[],
): number {
  const { suit, card } = move;
  let potential = 0;

  // 同スートで連続するカードの数
  for (const handCard of hand) {
    if (handCard.suit === suit) {
      const diff = Math.abs(handCard.rank - card.rank);
      if (diff === 1) {
        potential += 0.5; // 隣接カード
      } else if (diff === 2) {
        potential += 0.2; // 1枚飛ばし
      }
    }
  }

  return Math.min(potential, 1.0);
}

/**
 * デバッグ用：評価の内訳を表示
 */
export function explainMove(
  move: LegalMove,
  hand: Card[],
  board: BoardState,
  playerId: string,
  context?: { joker?: JokerContext; game?: GameContext },
): string {
  const personality = getPersonality(playerId);
  const aggressive = isAggressiveMove(move, board);
  const conservative = isConservativeMove(move, board);
  const risky = isRiskyMove(move, board, hand);
  const valuable = isValuableCard(move.card, hand, board);
  const blocking = isBlockingMove(move, board, context?.game);

  const charType = NO_PASS_CHARS[playerId]
    ? "NoPass"
    : WHIMSICAL_CHARS[playerId]
      ? "Whim"
      : STRATEGIC_CHARS[playerId]
        ? "Strategic"
        : "Normal";

  return `${playerId}(${charType}): pass=${personality.passTendency.toFixed(1)} | aggressive=${aggressive} risky=${risky} valuable=${valuable} blocking=${blocking}`;
}