import { Player } from '../types/game';

interface PlayerInfoProps {
  player: Player;
  isCurrentPlayer?: boolean;
  className?: string;
}

export function PlayerInfo({ player, isCurrentPlayer = false, className = '' }: PlayerInfoProps) {
  const positionClasses = {
    top: 'top-4 left-1/2 transform -translate-x-1/2',
    right: 'top-1/2 right-4 transform -translate-y-1/2',
    bottom: 'bottom-4 left-1/2 transform -translate-x-1/2',
    left: 'top-1/2 left-4 transform -translate-y-1/2'
  };

  const borderColor = isCurrentPlayer ? 'border-yellow-400' : 'border-gray-300';
  const bgColor = player.isEliminated ? 'bg-gray-100' : 'bg-white';

  return (
    <div className={`absolute ${positionClasses[player.position]} ${className}`}>
      <div className={`bg-white rounded-lg border-2 ${borderColor} p-3 min-w-[120px] shadow-lg ${bgColor}`}>
        {/* Avatar and name */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-2xl">{player.avatar}</div>
          <div className="text-sm">
            <div className={`${player.isEliminated ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              {player.name}
            </div>
            {isCurrentPlayer && !player.isEliminated && (
              <div className="text-xs text-yellow-600">現在のターン</div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">残り</span>
            <span className={`${player.handCount === 0 ? 'text-green-600' : 'text-blue-600'}`}>
              {player.handCount}枚
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">パス</span>
            <span className={`${player.passCount >= 3 ? 'text-red-600' : 'text-gray-800'}`}>
              {player.passCount}/3
            </span>
          </div>
        </div>

        {/* Last action */}
        {player.lastAction && (
          <div className="mt-2 p-1 bg-gray-50 rounded text-xs text-center">
            {player.lastAction}
          </div>
        )}

        {/* Status indicators */}
        {player.isEliminated && (
          <div className="mt-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs text-center">
            脱落
          </div>
        )}
        
        {player.handCount === 0 && !player.isEliminated && (
          <div className="mt-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs text-center">
            上がり
          </div>
        )}
      </div>
    </div>
  );
}