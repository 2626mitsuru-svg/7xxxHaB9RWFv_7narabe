import { 
  initBoard, 
  placeSevens, 
  getLegalMoves, 
  rankToIndex, 
  indexToRank,
  isConnectedFromSeven,
  neighborsWithAK,
  canPass,
  placeLoserHandOnBoard,
  evaluateMove
} from '../utils/gameLogic';
import { Card, GameOptions, BoardState } from '../types/game';

// テスト用のカード作成ヘルパー
const makeCard = (suit: '♠'|'♥'|'♦'|'♣', rank: number): Card => ({ 
  suit, 
  rank: rank as any,
  isJoker: false 
});

const makeJoker = (): Card => ({
  suit: '♠',
  rank: 1 as any,
  isJoker: true,
  jokerType: 'good'
});

const defaultOptions: GameOptions = {
  maxPass: 3,
  includeJokers: false,
  enableAKLink: true,
  jokerRule: 'off',
  passLimit: 3,
  startRule: 'holderOfDiamond7',
  akLink: true,
  jokerMode: 'none',
  strictJoker: true,
  rngSeed: 12345
};

describe('七並べロジックテスト', () => {
  describe('盤面初期化', () => {
    test('盤面が正しく初期化される', () => {
      const board = initBoard();
      expect(board['♠']).toHaveLength(13);
      expect(board['♥']).toHaveLength(13);
      expect(board['♦']).toHaveLength(13);
      expect(board['♣']).toHaveLength(13);
      
      // 全てnullで初期化
      expect(board['♠'].every(cell => cell === null)).toBe(true);
      expect(board['♥'].every(cell => cell === null)).toBe(true);
    });
  });

  describe('rank変換', () => {
    test('rank(1..13) → index(0..12)の変換', () => {
      expect(rankToIndex(1)).toBe(0); // A
      expect(rankToIndex(7)).toBe(6); // 7
      expect(rankToIndex(13)).toBe(12); // K
    });

    test('index(0..12) → rank(1..13)の変換', () => {
      expect(indexToRank(0)).toBe(1); // A
      expect(indexToRank(6)).toBe(7); // 7
      expect(indexToRank(12)).toBe(13); // K
    });
  });

  describe('7の配置', () => {
    test('7配置後に手札から7が除去される', () => {
      const board = initBoard();
      const hands = [
        [makeCard('♠', 7), makeCard('♠', 6)],
        [makeCard('♥', 7), makeCard('♠', 8)]
      ];
      
      placeSevens(board, hands);
      
      // 7が盤面に配置される
      expect(board['♠'][6]).toEqual(makeCard('♠', 7));
      expect(board['♥'][6]).toEqual(makeCard('♥', 7));
      
      // 手札から7が除去される
      expect(hands[0]).toEqual([makeCard('♠', 6)]);
      expect(hands[1]).toEqual([makeCard('♠', 8)]);
    });
  });

  describe('隣接判定（AKリンク）', () => {
    test('通常の隣接', () => {
      const neighbors = neighborsWithAK(6, false); // 7の隣接
      expect(neighbors).toContain(5); // 6
      expect(neighbors).toContain(7); // 8
      expect(neighbors).toHaveLength(2);
    });

    test('AKリンク有効時のA', () => {
      const neighbors = neighborsWithAK(0, true); // Aの隣接
      expect(neighbors).toContain(1); // 2
      expect(neighbors).toContain(12); // K（AKリンク）
      expect(neighbors).toHaveLength(2);
    });

    test('AKリンク有効時のK', () => {
      const neighbors = neighborsWithAK(12, true); // Kの隣接
      expect(neighbors).toContain(11); // Q
      expect(neighbors).toContain(0); // A（AKリンク）
      expect(neighbors).toHaveLength(2);
    });

    test('AKリンク無効時はA-K隣接なし', () => {
      const neighborsA = neighborsWithAK(0, false); // A
      const neighborsK = neighborsWithAK(12, false); // K
      
      expect(neighborsA).not.toContain(12);
      expect(neighborsK).not.toContain(0);
    });
  });

  describe('7からの連結チェック', () => {
    test('7が置かれていない場合は常にfalse', () => {
      const board = initBoard();
      expect(isConnectedFromSeven(board, '♠', 5)).toBe(false);
      expect(isConnectedFromSeven(board, '♠', 7)).toBe(false);
    });

    test('7からの連結判定（右側）', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7); // 7を配置
      
      expect(isConnectedFromSeven(board, '♠', 7)).toBe(true); // 7自身
      expect(isConnectedFromSeven(board, '♠', 8)).toBe(true); // 8は隣接なので可能
      expect(isConnectedFromSeven(board, '♠', 9)).toBe(false); // 8が置かれていないので不可
    });

    test('7からの連結判定（左側）', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7); // 7を配置
      
      expect(isConnectedFromSeven(board, '♠', 5)).toBe(true); // 6は隣接なので可能
      expect(isConnectedFromSeven(board, '♠', 4)).toBe(false); // 6が置かれていないので不可
    });

    test('GAPは連結を阻害する', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7); // 7を配置
      board['♠'][7] = 'GAP'; // 8の位置にGAP
      
      expect(isConnectedFromSeven(board, '♠', 8)).toBe(false); // GAPがあるので不可
    });
  });

  describe('合法手判定', () => {
    test('7配置後に隣接のみ出せる', () => {
      const board = initBoard();
      const hands = [[makeCard('♠', 7)], [makeCard('♠', 6), makeCard('♠', 8)]];
      placeSevens(board, hands);
      
      const moves6 = getLegalMoves(board, [makeCard('♠', 6)], defaultOptions);
      const moves8 = getLegalMoves(board, [makeCard('♠', 8)], defaultOptions);
      const moves5 = getLegalMoves(board, [makeCard('♠', 5)], defaultOptions);
      
      expect(moves6.some(m => m.position === rankToIndex(6))).toBe(true);
      expect(moves8.some(m => m.position === rankToIndex(8))).toBe(true);
      expect(moves5.length).toBe(0); // まだ連結していない
    });

    test('AKリンクが有効だとAとKが隣接扱い', () => {
      const board = initBoard();
      // 7とKを置いてからAを置けるか（AKリンク）
      board['♠'][6] = makeCard('♠', 7);
      board['♠'][12] = makeCard('♠', 13); // K
      
      const movesA = getLegalMoves(board, [makeCard('♠', 1)], defaultOptions);
      expect(movesA.length).toBe(1);
      expect(movesA[0].position).toBe(0); // A
    });

    test('AKリンク無効時はA-K隣接なし', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7);
      board['♠'][12] = makeCard('♠', 13); // K
      
      const optionsNoAK = { ...defaultOptions, enableAKLink: false, akLink: false };
      const movesA = getLegalMoves(board, [makeCard('♠', 1)], optionsNoAK);
      expect(movesA.length).toBe(0); // AKリンク無効なので置けない
    });
  });

  describe('パス判定', () => {
    test('合法手がある場合は基本パス不可', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7);
      
      const hand = [makeCard('♠', 6)];
      expect(canPass(board, hand, defaultOptions)).toBe(false);
    });

    test('合法手がない場合はパス可能', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7);
      
      const hand = [makeCard('♠', 5)]; // まだ連結していない
      expect(canPass(board, hand, defaultOptions)).toBe(true);
    });

    test('戦略パス：上限未到達時は合法手があってもパス可能', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7);
      
      const hand = [makeCard('♠', 6)];
      const passCount = 1; // 上限3未満
      
      expect(canPassStrategic(board, hand, passCount, defaultOptions)).toBe(true);
    });

    test('強制出し：上限到達時は合法手があればパス不可', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7);
      
      const hand = [makeCard('♠', 6)];
      const passCount = 3; // 上限到達
      
      expect(canPassStrategic(board, hand, passCount, defaultOptions)).toBe(false);
    });
  });

  describe('ジョーカールール', () => {
    test('ジョーカーは現在置ける位置にのみ配置可能', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7); // 7を配置
      
      const jokerOptions = { ...defaultOptions, jokerRule: 'single' as const };
      const moves = getLegalMoves(board, [makeJoker()], jokerOptions);
      
      // 7の隣接位置（6と8）にジョーカーを置ける
      const canPlaceAt6 = moves.some(m => m.suit === '♠' && m.position === 5);
      const canPlaceAt8 = moves.some(m => m.suit === '♠' && m.position === 7);
      
      expect(canPlaceAt6 || canPlaceAt8).toBe(true);
    });
  });

  describe('脱落処理', () => {
    test('脱落者の手札が盤面にGAPとして配置される', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7); // 7のみ配置
      
      const loserHand = [makeCard('♠', 5), makeCard('♥', 10)];
      placeLoserHandOnBoard(board, loserHand);
      
      // 連結していない位置にGAPが配置される
      expect(board['♠'][4]).toBe('GAP'); // 5の位置
      expect(board['♥'][9]).toBe('GAP'); // 10の位置
    });
  });

  describe('AI評価', () => {
    test('手を評価できる', () => {
      const board = initBoard();
      board['♠'][6] = makeCard('♠', 7);
      
      const move = {
        card: makeCard('♠', 6),
        suit: '♠' as const,
        position: 5,
        score: 0
      };
      
      const hand = [makeCard('♠', 6), makeCard('♠', 5)];
      const score = evaluateMove(move, hand, board);
      
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0); // 基本スコアがある
    });
  });
});