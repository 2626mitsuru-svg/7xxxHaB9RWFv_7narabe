import { 
  beginTurn,
  awaitAction,
  applyAction,
  advanceTurn,
  canPass,
  initializeTurnSystem
} from '../utils/turnLoop';
import { GameState, Card, PlayerAction } from '../types/game';
import { initBoard } from '../utils/gameLogic';

// テスト用のカード作成ヘルパー
const makeCard = (suit: '♠'|'♥'|'♦'|'♣', rank: number): Card => ({ 
  suit, 
  rank: rank as any,
  isJoker: false 
});

// テスト用のゲーム状態作成
const createTestGameState = (): GameState => ({
  players: [
    {
      id: 'player1',
      name: 'Player 1',
      avatar: '🤖',
      position: 'top',
      isEliminated: false,
      isFinished: false,
      handCount: 5,
      passCount: 0,
      lastAction: undefined
    },
    {
      id: 'player2',
      name: 'Player 2',
      avatar: '🤖',
      position: 'right',
      isEliminated: false,
      isFinished: false,
      handCount: 5,
      passCount: 0,
      lastAction: undefined
    }
  ],
  currentPlayerIndex: 0,
  board: initBoard(),
  gamePhase: 'playing',
  turnPhase: 'turn:start',
  turn: 1,
  turnId: 0,
  actionLock: false,
  rankings: [],
  options: {
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
  },
  history: []
});

describe('手番管理システム', () => {
  describe('手番の開始と進行', () => {
    test('手番が正しく初期化される', () => {
      const state = createTestGameState();
      initializeTurnSystem(state);
      
      expect(state.turnPhase).toBe('turn:start');
      expect(state.turnId).toBe(0);
      expect(state.actionLock).toBe(false);
      expect(state.turn).toBe(1);
    });

    test('手番の開始とアクション待機', () => {
      const state = createTestGameState();
      
      beginTurn(state);
      expect(state.turnPhase).toBe('turn:start');
      expect(state.actionLock).toBe(false);
      
      awaitAction(state);
      expect(state.turnPhase).toBe('turn:awaitAction');
    });
  });

  describe('アクションロック機能', () => {
    test('1手番で連続アクションが防止される', () => {
      const state = createTestGameState();
      const hands = [[makeCard('♠', 6), makeCard('♠', 8)], [makeCard('♥', 6)]];
      
      // 7を配置して合法手を作る
      state.board['♠'][6] = makeCard('♠', 7);
      
      beginTurn(state);
      awaitAction(state);
      
      const action1: PlayerAction = { 
        kind: 'play', 
        card: makeCard('♠', 6), 
        suit: '♠', 
        position: 5 
      };
      const action2: PlayerAction = { kind: 'pass' };
      
      applyAction(state, action1, hands);
      expect(state.actionLock).toBe(true);
      expect(state.players[0].lastAction).toBe('play');
      
      // 2回目のアクションは無視される
      applyAction(state, action2, hands);
      // lastActionは変わらない（passは無視された）
      expect(state.players[0].lastAction).toBe('play');
    });
  });

  describe('パス制限システム', () => {
    test('上限到達後は出せるならパス不可', () => {
      const state = createTestGameState();
      const hand = [makeCard('♠', 6)];
      
      // 7を配置して合法手を作る
      state.board['♠'][6] = makeCard('♠', 7);
      
      const player = state.players[0];
      player.passCount = 3; // 上限到達
      
      // 合法手があるのでパス不可
      const allowPass = canPass(state, player, hand);
      expect(allowPass).toBe(false);
    });

    test('上限到達後でも合法手がなければパス可能', () => {
      const state = createTestGameState();
      const hand = [makeCard('♠', 5)]; // まだ連結していない
      
      // 7のみ配置
      state.board['♠'][6] = makeCard('♠', 7);
      
      const player = state.players[0];
      player.passCount = 3; // 上限到達
      
      // 合法手がないのでパス可能（脱落判定へ）
      const allowPass = canPass(state, player, hand);
      expect(allowPass).toBe(true);
    });
  });

  describe('手番の移譲', () => {
    test('脱落プレイヤーがスキップされる', () => {
      const state = createTestGameState();
      state.players[1].isEliminated = true; // 2番目のプレイヤーが脱落
      state.currentPlayerIndex = 0;
      
      // 3番目と4番目のプレイヤーを追加
      state.players.push(
        {
          id: 'player3',
          name: 'Player 3',
          avatar: '🤖',
          position: 'bottom',
          isEliminated: false,
          isFinished: false,
          handCount: 5,
          passCount: 0
        },
        {
          id: 'player4',
          name: 'Player 4',
          avatar: '🤖',
          position: 'left',
          isEliminated: false,
          isFinished: false,
          handCount: 5,
          passCount: 0
        }
      );
      
      advanceTurn(state);
      
      // 脱落した1番をスキップして2番（index=2）に移行
      expect(state.currentPlayerIndex).toBe(2);
    });

    test('上がったプレイヤーがスキップされる', () => {
      const state = createTestGameState();
      state.players[1].isFinished = true; // 2番目のプレイヤーが上がり
      state.currentPlayerIndex = 0;
      
      // 3番目のプレイヤーを追加
      state.players.push({
        id: 'player3',
        name: 'Player 3',
        avatar: '🤖',
        position: 'bottom',
        isEliminated: false,
        isFinished: false,
        handCount: 5,
        passCount: 0
      });
      
      advanceTurn(state);
      
      // 上がった1番をスキップして2番（index=2）に移行
      expect(state.currentPlayerIndex).toBe(2);
    });
  });

  describe('ゲーム終了判定', () => {
    test('残り1人でゲーム終了', () => {
      const state = createTestGameState();
      state.players[1].isEliminated = true; // 1人脱落
      
      advanceTurn(state);
      
      expect(state.gamePhase).toBe('finished');
    });

    test('全員上がりでゲーム終了', () => {
      const state = createTestGameState();
      state.players[0].isFinished = true; // 1人上がり
      state.players[1].isEliminated = true; // 1人脱落（全体で1人のみアクティブ）
      
      advanceTurn(state);
      
      expect(state.gamePhase).toBe('finished');
    });
  });
});