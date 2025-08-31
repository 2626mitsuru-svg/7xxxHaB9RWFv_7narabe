import { BoardState, Card, GameState } from '../types/game';
import { getLegalMoves } from '../utils/gameLogic';

interface SevensBoardProps {
  gameState: GameState;
  className?: string;
}

// ★修正版：合法手ベースのハイライト計算（安全性チェック追加）
function createLegalMoveMap(gameState: GameState): Set<string> {
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return new Set();
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.isEliminated || currentPlayer.isFinished) {
    return new Set();
  }

  try {
    const legalMoves = getLegalMoves(gameState, currentPlayer.id);
    const legalSet = new Set<string>();
    
    legalMoves.forEach(move => {
      if (move.type === 'place' && move.card) {
        legalSet.add(`${move.card.suit}-${move.card.rank}`);
      }
    });
    
    return legalSet;
  } catch (error) {
    console.error('Error calculating legal moves:', error);
    return new Set();
  }
}

const SuitCard: React.FC<{ card: Card; isCenter?: boolean; isLegal?: boolean }> = ({ 
  card, 
  isCenter, 
  isLegal 
}) => {
  const suitColor = card.suit === '♥' || card.suit === '♦' ? 'text-red-500' : 'text-gray-800';
  const rankDisplay = card.rank === 1 ? 'A' : 
                     card.rank === 11 ? 'J' :
                     card.rank === 12 ? 'Q' :
                     card.rank === 13 ? 'K' : 
                     card.rank.toString();
  
  return (
    <div className={`
      w-12 h-16 rounded-lg border-2 bg-white shadow-md flex flex-col items-center justify-center text-xs font-bold
      ${isCenter ? 'border-yellow-400 bg-yellow-50' : 
        isLegal ? 'border-green-400 bg-green-50 ring-2 ring-green-400/60' : 
        'border-gray-300'}
      transition-all duration-200 hover:scale-105
    `}>
      <span className={suitColor}>{rankDisplay}</span>
      <span className={`text-lg ${suitColor}`}>{card.suit}</span>
    </div>
  );
};

const EmptySlot: React.FC<{ 
  isCenter?: boolean; 
  isLegal?: boolean; 
  suit: '♠' | '♥' | '♦' | '♣';
  rank: number;
}> = ({ isCenter, isLegal, suit, rank }) => {
  const suitColor = suit === '♥' || suit === '♦' ? 'text-red-400' : 'text-gray-400';
  const rankDisplay = rank === 1 ? 'A' : 
                     rank === 11 ? 'J' :
                     rank === 12 ? 'Q' :
                     rank === 13 ? 'K' : 
                     rank.toString();

  return (
    <div className={`
      w-12 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-xs
      ${isCenter ? 'border-yellow-400 bg-yellow-100/20' : 
        isLegal ? 'border-green-400 bg-green-100/20 ring-2 ring-green-400/60 animate-pulse' :
        'border-gray-600 bg-gray-800/20 opacity-35'}
      transition-all duration-200
    `}>
      {isLegal && (
        <>
          <span className={suitColor}>{rankDisplay}</span>
          <span className={`text-lg ${suitColor}`}>{suit}</span>
        </>
      )}
      {isCenter && !isLegal && <span className="text-yellow-400 text-xs">7</span>}
    </div>
  );
};

const SuitRow: React.FC<{ 
  suit: '♠' | '♥' | '♦' | '♣';
  suitCards: Array<Card | 'GAP' | string | null>;
  legalMoveMap: Set<string>;
}> = ({ suit, suitCards, legalMoveMap }) => {
  
  // ★安全性チェック：suitCardsが存在しない場合のfallback
  const cards = suitCards || Array(13).fill(null);
  
  // 左側（7より小さい数字）：A,2,3,4,5,6（昇順）
  const leftSlots = [];
  for (let rank = 1; rank <= 6; rank++) {
    const index = rank - 1; // rank-1でindex計算
    const card = cards[index];
    const cardKey = `${suit}-${rank}`;
    const isLegal = legalMoveMap.has(cardKey);
    
    leftSlots.push(
      <div key={`${suit}-${rank}`} className="flex-shrink-0">
        {card && typeof card === 'object' && 'suit' in card ? 
          <SuitCard card={card as Card} isLegal={isLegal} /> : 
          <EmptySlot suit={suit} rank={rank} isLegal={isLegal} />
        }
      </div>
    );
  }
  
  // 中央（7）
  const sevenIndex = 6; // rank 7 の位置
  const sevenCard = cards[sevenIndex];
  const centerSlot = (
    <div key={`${suit}-7`} className="flex-shrink-0">
      {sevenCard && typeof sevenCard === 'object' && 'suit' in sevenCard ? 
        <SuitCard card={sevenCard as Card} isCenter /> : 
        <EmptySlot suit={suit} rank={7} isCenter />
      }
    </div>
  );
  
  // 右側（7より大きい数字）：8,9,10,J,Q,K
  const rightSlots = [];
  for (let rank = 8; rank <= 13; rank++) {
    const index = rank - 1;
    const card = cards[index];
    const cardKey = `${suit}-${rank}`;
    const isLegal = legalMoveMap.has(cardKey);
    
    rightSlots.push(
      <div key={`${suit}-${rank}`} className="flex-shrink-0">
        {card && typeof card === 'object' && 'suit' in card ? 
          <SuitCard card={card as Card} isLegal={isLegal} /> : 
          <EmptySlot suit={suit} rank={rank} isLegal={isLegal} />
        }
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 p-2 bg-green-900/20 rounded-lg border border-green-700/30">
      {/* スート表示 */}
      <div className="flex-shrink-0 w-8 text-center">
        <span className={`text-2xl ${suit === '♥' || suit === '♦' ? 'text-red-400' : 'text-gray-300'}`}>
          {suit}
        </span>
      </div>
      
      {/* カード列 */}
      <div className="flex items-center gap-1">
        {leftSlots}
        {centerSlot}
        {rightSlots}
      </div>
    </div>
  );
};

export const SevensBoard: React.FC<SevensBoardProps> = ({ gameState, className = '' }) => {
  // ★安全性チェック：gameStateの妥当性確認
  if (!gameState || !gameState.board) {
    return (
      <div className={`sevens-board space-y-2 ${className}`}>
        <div className="text-center text-white text-lg font-bold mb-4">
          七並べ
        </div>
        <div className="text-center text-red-400">
          ゲームボードを読み込み中...
        </div>
      </div>
    );
  }

  // ★合法手マップを作成
  const legalMoveMap = createLegalMoveMap(gameState);
  
  const suits: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣'];
  
  return (
    <div className={`sevens-board space-y-2 ${className}`}>
      <div className="text-center text-white text-lg font-bold mb-4">
        七並べ
      </div>
      
      {suits.map((suit) => (
        <SuitRow 
          key={suit} 
          suit={suit}
          suitCards={gameState.board[suit] || Array(13).fill(null)}
          legalMoveMap={legalMoveMap}
        />
      ))}
      
      <div className="text-center text-sm text-gray-400 mt-4">
        7を中心に左右に並べていきます
        {legalMoveMap.size > 0 && (
          <div className="text-green-400 text-xs mt-1">
            緑色のスロットが出せる場所です
          </div>
        )}
      </div>
    </div>
  );
};