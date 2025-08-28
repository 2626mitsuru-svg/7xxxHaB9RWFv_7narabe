import {
  Card,
  Suit,
  Rank,
  GameOptions,
  BoardState,
  LegalMove,
  AITraits,
  GameState,
  Player,
  Move,
  CardMeta,
  GameStats,
  ReactionEvent,
} from "../types/game";
import { GAP, isEmptyCell, Cell } from "../types/board";
import { getCPUColor } from "./cpuColors";

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS: Rank[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
];

const IDX_A = 0; // A
const IDX_7 = 6; // 7
const IDX_K = 12; // K

// rank(1..13) → index(0..12)
export const rankToIndex = (r: Rank): number => r - 1;

// index(0..12) → rank(1..13)
export const indexToRank = (i: number): Rank => (i + 1) as Rank;

// ownerIndex用のキー生成関数
export function keyOf(suit: Suit, rank: Rank): string {
  return `${suit}:${rank}`;
}

// ★Joker廃止：52枚固定のデッキ生成
export function createDeck(): Card[] {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  const ranks: Rank[] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
  ];

  const deck: Card[] = [];

  // 通常のカード52枚のみ
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ suit: s, rank: r });
    }
  }

  console.debug("[createDeck] Created 52-card deck");
  return deck;
}

// UIエフェクトキューへの追加ヘルパー
export function pushUiFx(
  state: GameState,
  ev: ReactionEvent,
): void {
  if (!state.uiFx) state.uiFx = {};
  const prev = state.uiFx.queue ?? [];
  // ★参照を必ず更新：新しい配列を代入
  state.uiFx = { ...state.uiFx, queue: [...prev, ev] };
}

// ownerIndexの構築（通常カードのみ）
export function buildOwnerIndex(state: GameState): void {
  state.ownerIndex = {};
  for (const p of state.players || []) {
    // ★修正：null安全
    for (const c of p.hand) {
      state.ownerIndex[keyOf(c.suit, c.rank)] = p.id;
    }
  }
  console.debug(
    "[buildOwnerIndex] Built index for",
    Object.keys(state.ownerIndex).length,
    "cards",
  );
}

// ownerIndexの差分更新（カード移動時）
export function updateOwnerIndex(
  state: GameState,
  action: "remove" | "add",
  suit: Suit,
  rank: Rank,
  playerId?: string,
): void {
  const key = keyOf(suit, rank);
  if (action === "remove") {
    delete state.ownerIndex[key];
  } else if (action === "add" && playerId) {
    state.ownerIndex[key] = playerId;
  }
}

// O(1)所有者探索
export function findCardOwner(
  state: GameState,
  suit: Suit,
  rank: Rank,
): Player | null {
  const ownerId = state.ownerIndex[keyOf(suit, rank)];
  if (!ownerId || !state.players) return null; // ★修正：null安全
  return state.players.find((p) => p.id === ownerId) || null;
}

export function shuffleDeck(
  deck: Card[],
  seed: number,
): Card[] {
  const shuffled = [...deck];
  let currentIndex = shuffled.length;

  let random = seed;
  const seededRandom = () => {
    const x = Math.sin(random++) * 10000;
    return x - Math.floor(x);
  };

  while (currentIndex !== 0) {
    const randomIndex = Math.floor(
      seededRandom() * currentIndex,
    );
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[currentIndex],
    ];
  }

  return shuffled;
}

export function dealCards(
  deck: Card[],
  playerCount: number,
): Card[][] {
  const hands: Card[][] = Array(playerCount)
    .fill(null)
    .map(() => []);

  for (let i = 0; i < deck.length; i++) {
    hands[i % playerCount].push(deck[i]);
  }

  return hands;
}

// 盤面初期化：各スートに13長の配列を作成
export function initBoard(): BoardState {
  return {
    "♠": Array(13).fill(null),
    "♥": Array(13).fill(null),
    "♦": Array(13).fill(null),
    "♣": Array(13).fill(null),
  };
}

// カードメタデータ初期化
export function initCardMeta(): Record<
  Suit,
  (CardMeta | null)[]
> {
  return {
    "♠": Array(13).fill(null),
    "♥": Array(13).fill(null),
    "♦": Array(13).fill(null),
    "♣": Array(13).fill(null),
  };
}

// 旧関数名との互換性
export const initializeBoard = initBoard;

// スート内の端位置を取得（A-Kブリッジ対応）
function getEdgeSlots(
  board: BoardState,
  suit: Suit,
): { left: number; right: number } {
  const row = board[suit];

  let left = IDX_7;
  while (true) {
    const prev = left - 1 >= 0 ? left - 1 : IDX_K; // A-Kブリッジ
    const cell = row[prev];
    console.debug(`[getEdgeSlots] ${suit} checking left idx=${prev}`, 
      'cell=', cell === GAP ? 'GAP' : cell, 
      'isEmpty=', isEmptyCell(cell as Cell));
    
    if (!isEmptyCell(cell as Cell)) {
      left = prev;
    } else break;
  }

  let right = IDX_7;
  while (true) {
    const next = right + 1 <= IDX_K ? right + 1 : IDX_A; // A-Kブリッジ
    const cell = row[next];
    console.debug(`[getEdgeSlots] ${suit} checking right idx=${next}`, 
      'cell=', cell === GAP ? 'GAP' : cell, 
      'isEmpty=', isEmptyCell(cell as Cell));
    
    if (!isEmptyCell(cell as Cell)) {
      right = next;
    } else break;
  }

  console.debug(`[getEdgeSlots] ${suit} edges determined: left=${left}, right=${right}`);
  return { left, right };
}

// ★Joker廃止：通常カードの合法判定（端の直外側のみ）
function isLegalNormalPlacement(
  board: BoardState,
  suit: Suit,
  idx: number,
): boolean {
  const { left, right } = getEdgeSlots(board, suit);
  const leftTarget = left - 1 >= 0 ? left - 1 : IDX_K; // A-Kブリッジ
  const rightTarget = right + 1 <= IDX_K ? right + 1 : IDX_A; // A-Kブリッジ

  console.debug(`[isLegalNormalPlacement] ${suit} edges: left=${left}, right=${right}, targets: ${leftTarget}, ${rightTarget}, check idx=${idx}`);
  
  const isLegal = idx === leftTarget || idx === rightTarget;
  console.debug(`[isLegalNormalPlacement] ${suit}${idx+1} is legal: ${isLegal}`);
  
  return isLegal;
}

// 7の自動配置（個人手数対応）
export function autoPlaceSevens(state: GameState): void {
  if (!state.players) {
    // ★修正：null安全
    console.error(
      "[autoPlaceSevens] state.players is null or undefined",
    );
    return;
  }

  for (const suit of SUITS) {
    for (const p of state.players) {
      const i = p.hand.findIndex(
        (c) => c.suit === suit && c.rank === 7,
      );
      if (i >= 0) {
        const card = p.hand.splice(i, 1)[0];
        state.board[suit][6] = card;

        // ownerIndex更新
        updateOwnerIndex(state, "remove", card.suit, card.rank);

        // 個人手数を採番
        const pid = p.id;
        const playerMoveNo = state.perPlayerMoves[pid] ?? 1;
        state.perPlayerMoves[pid] = playerMoveNo + 1;

        // メタデータ付与
        state.cardMeta[suit][6] = {
          playedBy: p.id,
          move: state.nextMoveNo++,
          playerMove: playerMoveNo,
          dumped: false,
        };

        p.handCount = p.hand.length;
        break;
      }
    }
  }
}

// ★Joker廃止：厳密な合法手判定（端の直外側のみ許可）
export function canPlace(
  board: BoardState,
  card: Card,
  options: GameOptions = {},
): boolean {
  const row = board[card.suit];
  const idx = rankToIndex(card.rank);

  console.debug(`[canPlace] Checking ${card.suit}${card.rank} at idx=${idx}, current cell=`, 
    row[idx] === GAP ? 'GAP' : row[idx], 
    'isEmpty=', isEmptyCell(row[idx] as Cell));

  // 既にカードがある場合は不可（GAP は上書き可能）
  if (!isEmptyCell(row[idx] as Cell)) {
    console.debug(`[canPlace] Cell occupied: ${card.suit}${card.rank} cannot be placed`);
    return false;
  }

  // AKリンクの設定確認
  const enableAK =
    options.enableAKLink ?? options.akLink ?? true;
  if (!enableAK) {
    console.warn("AK Link disabled mode not fully implemented");
  }

  // 端の直外側のみ許可
  const isLegal = isLegalNormalPlacement(board, card.suit, idx);
  console.debug(`[canPlace] Legal placement check: ${card.suit}${card.rank} -> ${isLegal}`);
  
  return isLegal;
}

// 7の初期配置：各手札から7を抜いて盤面のindex 6に配置
export function placeSevens(
  board: BoardState,
  hands: Card[][],
): void {
  for (const hand of hands) {
    for (let i = hand.length - 1; i >= 0; i--) {
      const c = hand[i];
      if (c.suit && c.rank === 7) {
        board[c.suit][6] = c;
        hand.splice(i, 1);
      }
    }
  }
}

// 7からの連結チェック：指定位置まで途切れずに連結されているか
export function isConnectedFromSeven(
  board: BoardState,
  suit: Suit,
  idx: number,
): boolean {
  const seven = 6;
  if (board[suit][seven] === null) return false; // 7が置かれていない
  if (idx === seven) return true; // 7自身

  const step = idx > seven ? 1 : -1;
  for (let i = seven + step; i !== idx; i += step) {
    const cell = board[suit][i];
    if (isEmptyCell(cell as Cell)) return false;
  }
  return true;
}

// AKリンク対応の隣接位置取得
export function neighborsWithAK(
  idx: number,
  enableAK: boolean,
): number[] {
  const ns = [];
  if (idx > 0) ns.push(idx - 1);
  if (idx < 12) ns.push(idx + 1);

  if (enableAK) {
    if (idx === 0) ns.push(12); // A の隣に K
    if (idx === 12) ns.push(0); // K の隣に A
  }
  return ns;
}

// ★Joker廃止：合法手取得（通常カードのみ）
export function getLegalMoves(
  board: BoardState,
  hand: Card[],
  options: GameOptions,
): LegalMove[];
export function getLegalMoves(
  gameState: GameState,
  playerId: string,
): Move[];
export function getLegalMoves(
  arg1: BoardState | GameState,
  arg2: Card[] | string,
  arg3?: GameOptions,
): LegalMove[] | Move[] {
  // オーバーロード対応
  if ("players" in arg1) {
    // GameState版
    const gameState = arg1 as GameState;
    const playerId = arg2 as string;

    // ★修正：null安全チェック
    if (!gameState.players) {
      console.error(
        "[getLegalMoves] gameState.players is null or undefined",
      );
      return [];
    }

    const player = gameState.players.find(
      (p) => p.id === playerId,
    );
    if (!player) return [];

    const legalMoves = getLegalMovesCore(
      gameState.board,
      player.hand,
      gameState.options || {},
      gameState,
    );

    // Move型に変換
    return legalMoves.map((move) => ({
      type: "place" as const,
      card: move.card,
      playerId,
    }));
  } else {
    // BoardState版
    const board = arg1 as BoardState;
    const hand = arg2 as Card[];
    const options = arg3 || {};

    return getLegalMovesCore(board, hand, options);
  }
}

// ★Joker廃止：getLegalMovesCoreの簡素化（通常カードのみ）
function getLegalMovesCore(
  board: BoardState,
  hand: Card[],
  options: GameOptions,
  gameState?: GameState,
): LegalMove[] {
  const moves: LegalMove[] = [];

  // 通常カードの合法手（厳格化された判定）
  for (const card of hand) {
    const idx = rankToIndex(card.rank);
    const row = board[card.suit];
    
    console.debug(`[getLegalMovesCore] Checking ${card.suit}${card.rank} at idx=${idx}`, 
      'cell=', row[idx] === GAP ? 'GAP' : row[idx],
      'isEmpty=', isEmptyCell(row[idx] as Cell));
    
    if (canPlace(board, card, options)) {
      const position = rankToIndex(card.rank);

      // いじわるパス用評価フラグの設定
      const opensNewEnd = isNewEndMove(board, card);
      const wouldReleaseMyBlock = gameState
        ? isBlockReleaseMove(gameState, card)
        : false;

      console.debug(`[getLegalMovesCore] Legal move found: ${card.suit}${card.rank}`);

      moves.push({
        card,
        suit: card.suit,
        position,
        score: 0,
        opensNewEnd,
        wouldReleaseMyBlock,
      });
    }
  }

  console.debug(`[getLegalMovesCore] Found ${moves.length} legal moves`);
  return moves;
}

// 新端を開く手かどうかの判定
function isNewEndMove(board: BoardState, card: Card): boolean {
  const row = board[card.suit];
  const position = rankToIndex(card.rank);

  // 端（A or K）を開く手は新端
  if (position === 0 || position === 12) {
    // 隣が空いている場合は新端を開く
    const adjacentIdx = position === 0 ? 1 : 11;
    return isEmptyCell(row[adjacentIdx] as Cell);
  }

  return false;
}

// 自分のブロックを解放する手かどうかの判定
function isBlockReleaseMove(
  gameState: GameState,
  card: Card,
): boolean {
  const position = rankToIndex(card.rank);

  // ★修正：null安全チェック
  if (!gameState.players) return false;

  const player = gameState.players.find((p) =>
    p.hand.includes(card),
  );
  if (!player) return false;

  // 自分が持っている隣接カードがあるかチェック
  const sameSuitCards = player.hand.filter(
    (c) => c.suit === card.suit && c.rank !== card.rank,
  );

  // 隣接する位置にカードがある場合、そのブロックを解放することになる
  return sameSuitCards.some((c) => {
    const otherPos = rankToIndex(c.rank);
    return Math.abs(otherPos - position) === 1;
  });
}

// パス可能かの判定：合法手が0枚の場合のみ（旧版・互換性用）
export function canPass(
  board: BoardState,
  hand: Card[],
  options: GameOptions,
): boolean {
  return getLegalMovesCore(board, hand, options).length === 0;
}

// 新しいパス判定：戦略パス可、ただし上限到達後は強制出し
export function canPassStrategic(
  board: BoardState,
  hand: Card[],
  passCount: number,
  options: GameOptions,
): boolean {
  const moves = getLegalMovesCore(board, hand, options);
  const hasMoves = moves.length > 0;
  const maxPass = options.maxPass ?? options.passLimit ?? 3;

  // すでに上限に達しているなら、出せるときはパス不可（強制出し）
  if (passCount >= maxPass) {
    return !hasMoves; // 出せないときだけパス可（= パスしたら脱落判定へ）
  }
  // 上限未到達なら、出せる/出せないに関係なくパス可（戦略パスOK）
  return true;
}

// ドボン時の手札全放出（メタデータ付き）
export function placeLoserHandOnBoard(
  board: BoardState,
  remaining: Card[],
): void {
  // 旧版との互換性のため残すが、新版を推奨
  console.warn(
    "placeLoserHandOnBoard is deprecated. Use placeLoserHandOnBoardWithMeta instead.",
  );

  const SEVEN = 6;
  for (const c of remaining) {
    const row = board[c.suit];
    const idx = rankToIndex(c.rank);

    if (isEmptyCell(row[idx] as Cell)) {
      row[idx] = c;
    }

    const step = idx > SEVEN ? 1 : -1;
    for (let i = SEVEN + step; i !== idx; i += step) {
      if (row[i] === null) row[i] = GAP;
    }
  }
}

// ドボン展開（⚰️ 表示のみで、番号は付けない）
export function placeLoserHandOnBoardWithMeta(
  state: GameState,
  player: Player,
): void {
  const SEVEN = 6;
  for (const c of player.hand) {
    const row = state.board[c.suit];
    const idx = rankToIndex(c.rank);

    if (isEmptyCell(row[idx] as Cell)) {
      row[idx] = c;

      // ownerIndex更新（ドボン展開時は削除のみ）
      updateOwnerIndex(state, "remove", c.suit, c.rank);

      // メタデータ付与（ドボン展開：playerMove は設定しない）
      state.cardMeta[c.suit][idx] = {
        playedBy: player.id,
        move: state.nextMoveNo++,
        dumped: true,
        // playerMove は設定しない（UI側は dumped を優先表示）
      };
    }

    // GAP埋め
    const step = idx > SEVEN ? 1 : -1;
    for (let i = SEVEN + step; i !== idx; i += step) {
      if (row[i] === null) {
        row[i] = GAP;
      }
    }
  }
}

// 敗退者全員の手札をまとめて盤面へ（メタデータ版使用）
export function dumpAllLosersHandsToBoard(
  state: GameState,
): void {
  if (!state.players) return; // ★修正：null安全

  state.players.forEach((p) => {
    if (p.isEliminated && p.hand.length > 0) {
      placeLoserHandOnBoardWithMeta(state, p);
      p.hand = [];
      p.handCount = 0;
    }
  });
}

// ラウンド終了時の最終スイープ（全アクティブ0になったら保険で実行）
export function finalizeBoardFill(state: GameState): void {
  if (!state.players) return; // ★修正：null安全

  const anyActive = state.players.some(
    (p) => !p.isEliminated && !p.isFinished,
  );
  if (anyActive) return;

  dumpAllLosersHandsToBoard(state);

  // 保険埋め：残った空きスロットをdealtDeckで埋める
  for (const suit of SUITS) {
    const row = state.board[suit];
    for (let idx = 0; idx < 13; idx++) {
      if (row[idx] === null) {
        const rank = indexToRank(idx);
        const card = state.dealtDeck.find(
          (c) => c.suit === suit && c.rank === rank,
        );
        if (card) {
          row[idx] = card;
          state.cardMeta[suit][idx] = {
            playedBy: "system",
            move: state.nextMoveNo++,
            dumped: true,
            // playerMove は設定しない（systemなので）
          };
        }
      }
    }
  }
}

// 通常出し（placeCard 呼び出し時にownerIndex更新）
export function placeCard(
  state: GameState,
  player: Player,
  card: Card,
): void {
  const idx = rankToIndex(card.rank);
  const row = state.board[card.suit];

  console.debug(`[placeCard] Placing ${card.suit}${card.rank} at idx=${idx}`, 
    'cell before=', row[idx] === GAP ? 'GAP' : row[idx],
    'isEmpty=', isEmptyCell(row[idx] as Cell));

  // ★重要：GAP上への配置可能チェック
  if (!isEmptyCell(row[idx] as Cell)) {
    console.error(`[placeCard] Cell occupied: ${card.suit}${card.rank} cannot be placed on`, row[idx]);
    throw new Error(`Cannot place card: cell is occupied`);
  }

  // 出し方のニュアンス解析
  const moveDetails = analyzePlayNuance(state, card);
  state.lastPlaced = moveDetails;

  // ★修正：GAP を確実に上書き
  row[idx] = card;
  console.debug(`[placeCard] Successfully placed ${card.suit}${card.rank}, cell after=`, row[idx]);

  // ownerIndex更新
  updateOwnerIndex(state, "remove", card.suit, card.rank);

  // 個人手数を採番
  const pid = player.id;
  const playerMoveNo = state.perPlayerMoves[pid] ?? 1;
  state.perPlayerMoves[pid] = playerMoveNo + 1;

  // メタデータ付与
  state.cardMeta[card.suit][idx] = {
    playedBy: pid,
    move: state.nextMoveNo++,
    playerMove: playerMoveNo,
    dumped: false,
  };

  // 手札から除去
  const cardIndex = player.hand.findIndex(
    (c) => c.suit === card.suit && c.rank === card.rank,
  );
  if (cardIndex >= 0) {
    player.hand.splice(cardIndex, 1);
    player.handCount = player.hand.length;
  }
}

// 出し方のニュアンス解析
function analyzePlayNuance(
  state: GameState,
  card: Card,
): NonNullable<GameState["lastPlaced"]> {
  const idx = rankToIndex(card.rank);
  const row = state.board[card.suit];

  const details: NonNullable<GameState["lastPlaced"]> = {
    suit: card.suit,
    rank: card.rank,
  };

  // 新しい端を開いた or 既存端を伸ばした
  const isLeftEnd =
    idx === 0 || (idx > 0 && isEmptyCell(row[idx - 1] as Cell));
  const isRightEnd =
    idx === 12 || (idx < 12 && isEmptyCell(row[idx + 1] as Cell));

  if ((isLeftEnd && idx === 0) || (isRightEnd && idx === 12)) {
    details.wasNewEnd = true;
  } else if (isLeftEnd || isRightEnd) {
    details.extendedEnd = true;
  }

  // AK完成判定
  if (
    card.rank === 1 &&
    !isEmptyCell(row[12] as Cell)
  ) {
    details.completedAKtoA = true;
  }
  if (card.rank === 13 && !isEmptyCell(row[0] as Cell)) {
    details.completedAKtoK = true;
  }

  return details;
}

// ★修正：統一されたgetRankOfPlayer関数（オーバーロード対応）
export function getRankOfPlayer(
  state: GameState,
  playerId: string,
): number;
export function getRankOfPlayer(
  player: Player,
  state: GameState,
): number;
export function getRankOfPlayer(
  stateOrPlayer: GameState | Player,
  playerIdOrState: string | GameState,
): number {
  let state: GameState;
  let playerId: string;

  // 引数の順序を判定
  if ("players" in stateOrPlayer) {
    // 第1引数がGameState
    state = stateOrPlayer as GameState;
    playerId = playerIdOrState as string;
  } else {
    // 第1引数がPlayer（旧互換性）
    const player = stateOrPlayer as Player;
    state = playerIdOrState as GameState;
    playerId = player.id;
  }

  const finishedIndex = state.rankings.findIndex(
    (id) => id === playerId,
  );
  return finishedIndex >= 0
    ? finishedIndex + 1
    : state.rankings.length + 1;
}

// プレイヤー脱落処理（旧関数との互換性）
export function eliminatePlayer(
  board: BoardState,
  hand: Card[],
): void {
  placeLoserHandOnBoard(board, hand);
}

// ゲーム完了判定
export function isGameComplete(
  hands: Card[][],
  eliminatedPlayers: boolean[],
): boolean {
  const activePlayers = hands.filter(
    (_, i) => !eliminatedPlayers[i] && hands[i].length > 0,
  );
  return activePlayers.length <= 1;
}

// 手札からカード除去
export function removeCardFromHand(
  player: Player,
  card: Card,
): Player {
  return {
    ...player,
    hand: player.hand.filter(
      (c) => !(c.suit === card.suit && c.rank === card.rank),
    ),
  };
}

// 安全なパス上限取得
export function getMaxPassCount(
  options: GameOptions = {},
): number {
  return options.maxPass ?? options.passLimit ?? 3;
}

// ★Joker廃止：初期化（52枚、ownerIndex構築）
export function initializeGame(
  playerIds: string[],
  options: {} = {},
): GameState {
  // ★強化：入力検証
  if (
    !playerIds ||
    !Array.isArray(playerIds) ||
    playerIds.length === 0
  ) {
    throw new Error(
      "Invalid playerIds: must be a non-empty array",
    );
  }

  try {
    // ★52枚固定デッキ作成
    const deck = shuffleDeck(createDeck(), Date.now());
    const hands = dealCards(deck, playerIds.length);
    const board = initBoard();

    console.debug("[initializeGame]", {
      deckSize: deck.length,
      players: playerIds.length,
    });

    // プレイヤー初期化（色テーブル起点の名前設定）
    const players: Player[] = playerIds.map((id, index) => {
      // 色テーブルから「1主/2主…」の名前を取得
      let displayName: string;
      try {
        const cpuColor = getCPUColor(id);
        displayName = cpuColor.name; // "1主", "2主" など
      } catch (error) {
        console.warn(
          `Failed to get CPU color for ${id}, using fallback name`,
        );
        displayName = `CPU${index + 1}`;
      }

      return {
        id,
        name: displayName,
        hand: hands[index] || [], // ★修正：null安全
        handCount: hands[index]?.length || 0, // ★修正：null安全
        passCount: 0,
        isEliminated: false,
        isFinished: false,
      };
    });

    // ★検証：プレイヤー配列が正しく作成されたことを確認
    if (!players || players.length === 0) {
      throw new Error("Failed to create players array");
    }

    // 個人手数カウンタ初期化
    const perPlayerMoves: Record<string, number> = {};
    for (const p of players) {
      perPlayerMoves[p.id] = 1; // 個人手数は1始まり
    }

    const state: GameState = {
      players, // ★確実にnull以外の配列を設定
      board,
      currentPlayerIndex: 0,
      turnId: 0,
      turn: 1,
      gamePhase: "playing",
      turnPhase: "turn:begin",
      actionLock: false,
      options: {
        maxPass: 3,
        eliminateOnFourthPass: true,
        akLink: true,
        debugFx: false,
      },
      rankings: [],
      moveHistory: [],
      logs: [
        `ゲームを開始しました。プレイヤー数: ${playerIds.length}`,
      ],

      // メタデータ初期化
      cardMeta: initCardMeta(),
      nextMoveNo: 1,
      dealtDeck: deck.slice(),
      perPlayerMoves,

      // ownerIndex初期化
      ownerIndex: {},

      // 統計情報初期化
      stats: { gamesPlayed: 1 },

      // パス連続カウント初期化
      passStreak: 0,
    };

    // ★最終検証：players配列が確実に存在することを確認
    if (
      !state.players ||
      !Array.isArray(state.players) ||
      state.players.length === 0
    ) {
      throw new Error(
        "GameState.players is invalid after initialization",
      );
    }

    // ownerIndex構築（通常カードのみ）
    buildOwnerIndex(state);

    // 7の自動配置（メタデータ付き、個人手数対応）
    autoPlaceSevens(state);

    console.log(
      "Initialized 52-card game with optimized owner index:",
      state,
    );
    return state;
  } catch (error) {
    console.error(
      "[initializeGame] Failed to initialize game:",
      error,
    );
    throw error; // エラーを再スロー
  }
}

// ★Joker廃止：手の評価（通常カードのみ）
export function evaluateMove(
  move: LegalMove,
  hand: Card[],
  board: BoardState,
  traits: AITraits = getDefaultTraits(),
  options: GameOptions = {},
): number {
  let score = 0;

  // 基本スコア
  score += 10;

  // 新しい端を開くことのペナルティ
  const suitRow = board[move.suit];
  const isNewEnd =
    (move.position === 0 && isEmptyCell(suitRow[1] as Cell)) ||
    (move.position === 12 && isEmptyCell(suitRow[11] as Cell));
  if (isNewEnd) {
    score -= 5 * traits.conservativeness;
  }

  // 連鎖ボーナス
  const chainBonus = calculateChainBonus(move, hand);
  score += chainBonus * traits.aggressiveness;

  // ブロック価値
  const blockValue = calculateBlockValue(move, hand, board);
  score -= blockValue * traits.blocker;

  return score;
}

function calculateChainBonus(
  move: LegalMove,
  hand: Card[],
): number {
  let bonus = 0;
  const { suit, card } = move;

  for (const handCard of hand) {
    if (handCard.suit === suit && handCard.rank) {
      const rankDiff = Math.abs(handCard.rank - card.rank);
      if (rankDiff === 1) {
        bonus += 3;
      }
    }
  }

  return bonus;
}

function calculateBlockValue(
  move: LegalMove,
  hand: Card[],
  board: BoardState,
): number {
  const { suit, card } = move;
  const suitRow = board[suit];
  let blockValue = 0;

  // キーカードかどうかの判定
  const isKeyCard =
    (card.rank === 6 && isEmptyCell(suitRow[7] as Cell)) ||
    (card.rank === 8 && isEmptyCell(suitRow[5] as Cell)) ||
    (card.rank === 1 && isEmptyCell(suitRow[1] as Cell)) ||
    (card.rank === 13 && isEmptyCell(suitRow[11] as Cell));

  if (isKeyCard) {
    blockValue = 8;
  }

  return blockValue;
}

export function getDefaultTraits(): AITraits {
  return {
    aggressiveness: 1.0,
    conservativeness: 1.0,
    blocker: 1.0,
    opener: 1.0,
    passGreed: 1.0,
    akPreference: 1.0,
    strategicPass: 0.5,
    spitePass: 0.5,
  };
}

// ★Joker廃止：パス判定（通常手のみで判断）
export function shouldPass(
  board: BoardState,
  hand: Card[],
  passCount: number,
  options: GameOptions,
  traits: AITraits,
): boolean {
  const legalMoves = getLegalMovesCore(board, hand, options);
  const maxPass = options.maxPass ?? options.passLimit ?? 3;

  if (legalMoves.length === 0) return true; // 強制パス
  if (passCount >= maxPass) return false; // 強制出し

  // 戦略的パス判断（通常手のみ）
  const bestMove = legalMoves.reduce((best, move) =>
    evaluateMove(move, hand, board, traits) >
    evaluateMove(best, hand, board, traits)
      ? move
      : best,
  );

  const bestScore = evaluateMove(bestMove, hand, board, traits);
  const passValue =
    (maxPass - passCount) * 2 * traits.passGreed;

  return bestScore < passValue;
}

// ユーティリティ関数
export function getRankName(rank: Rank): string {
  switch (rank) {
    case 1:
      return "A";
    case 11:
      return "J";
    case 12:
      return "Q";
    case 13:
      return "K";
    default:
      return rank.toString();
  }
}

export function getSuitColor(suit: Suit): string {
  return suit === "♥" || suit === "♦"
    ? "text-red-600"
    : "text-gray-800";
}

export function getSuitSymbol(suit: Suit): string {
  return suit;
}

export function getSuitName(suit: Suit): string {
  switch (suit) {
    case "♠":
      return "スペード";
    case "♥":
      return "ハート";
    case "♦":
      return "ダイヤ";
    case "♣":
      return "クラブ";
  }
}