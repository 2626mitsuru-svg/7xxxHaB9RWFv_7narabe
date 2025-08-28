import { Card, Suit, BoardState } from '../types/game';
import { SUITS, RANKS, getRankName, getSuitColor } from '../utils/gameLogic';

interface CardGridProps {
  board: BoardState;
  className?: string;
}

interface CardCellProps {
  card: Card | null;
  suit: Suit;
  rank: number;
  isEmpty?: boolean;
}

function CardCell({ card, suit, rank, isEmpty }: CardCellProps) {
  const rankName = getRankName((rank + 1) as any);
  const suitColor = getSuitColor(suit);
  
  if (isEmpty) {
    return (
      <div className="w-12 h-16 border border-dashed border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
        <span className="text-xs text-gray-400">{suit}{rankName}</span>
      </div>
    );
  }
  
  if (!card) {
    return (
      <div className="w-12 h-16 border border-gray-300 rounded-md bg-white"></div>
    );
  }
  
  return (
    <div className={`w-12 h-16 border border-gray-400 rounded-md bg-white flex flex-col items-center justify-center shadow-sm ${card.isJoker ? 'bg-yellow-100' : ''}`}>
      <div className={`text-lg ${suitColor}`}>
        {card.suit}
      </div>
      <div className={`text-xs ${suitColor}`}>
        {card.isJoker ? 'JKR' : rankName}
      </div>
    </div>
  );
}

export function CardGrid({ board, className = '' }: CardGridProps) {
  return (
    <div className={`inline-block p-4 bg-green-800 rounded-lg border-4 border-yellow-600 ${className}`}>
      <div className="grid grid-cols-13 gap-1">
        {/* Header row with rank labels */}
        <div></div>
        {RANKS.map(rank => (
          <div key={rank} className="w-12 h-6 flex items-center justify-center text-white text-xs">
            {getRankName(rank)}
          </div>
        ))}
        
        {/* Card rows */}
        {SUITS.map(suit => (
          <div key={suit} className="contents">
            {/* Suit label */}
            <div className="w-6 h-16 flex items-center justify-center text-white text-xl">
              {suit}
            </div>
            
            {/* Cards */}
            {RANKS.map((rank, index) => (
              <CardCell
                key={`${suit}-${rank}`}
                card={board[suit][index]}
                suit={suit}
                rank={index}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}