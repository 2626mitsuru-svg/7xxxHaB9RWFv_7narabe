import { Player, GameOptions } from '../types/game';
import { getExpressionSrc, Expression } from '../hooks/useExpressionController';
import { getMaxPassCount } from '../utils/gameLogic';

interface SevensPlayerProps {
  player: Player;
  expression: Expression;
  speech: string;
  isCurrentTurn: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  options?: GameOptions;
}

const BackCard: React.FC = () => (
  <div className="w-6 h-8 bg-blue-600 border border-blue-700 rounded-sm shadow-sm flex items-center justify-center">
    <div className="w-3 h-4 bg-blue-800 rounded-xs"></div>
  </div>
);

export const SevensPlayer: React.FC<SevensPlayerProps> = ({
  player,
  expression,
  speech,
  isCurrentTurn,
  position,
  options = { maxPass: 3 }
}) => {
  const expressionUrl = getExpressionSrc(player.id, expression);
  
  // 位置に応じたレイアウト調整
  const isTop = position.includes('top');
  const isLeft = position.includes('left');
  
  return (
    <div className={`
      sevens-player relative w-full h-full max-w-xs
      ${isCurrentTurn ? 'ring-2 ring-yellow-400 ring-opacity-60' : ''}
    `}>
      {/* プレイヤー情報エリア */}
      <div className="bg-gray-800/80 rounded-lg p-3 backdrop-blur-sm border border-gray-600">
        
        {/* 表情画像 */}
        <div className="relative mb-3">
          <div className="w-20 h-20 mx-auto rounded-full border-4 border-gray-500 overflow-hidden bg-white shadow-lg">
            <img
              src={expressionUrl}
              alt={`${player.name}の表情`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // フォールバック画像
                (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23ccc"/><text x="40" y="45" text-anchor="middle" fill="%23666" font-size="12">顔</text></svg>';
              }}
            />
          </div>
          
          {/* ターン表示 */}
          {isCurrentTurn && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-gray-800">●</span>
            </div>
          )}
        </div>
        
        {/* 吹き出し */}
        {speech && (
          <div className="relative mb-3">
            <div className="bg-white text-gray-800 text-sm px-3 py-2 rounded-lg shadow-md border border-gray-300 min-h-[2.5rem] flex items-center justify-center">
              <span className="text-center leading-tight">{speech}</span>
            </div>
            {/* 吹き出しの矢印 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          </div>
        )}
        
        {/* プレイヤー情報 */}
        <div className="text-center mb-3">
          <div className="text-white font-bold text-lg">{player.name}</div>
          <div className="text-gray-300 text-sm">
            手札: {player.hand?.length ?? 0}枚 | パス: {player.passCount ?? 0}/{getMaxPassCount(options)}
          </div>
          {player.isFinished && (
            <div className="text-yellow-400 text-sm font-bold">
              完了
            </div>
          )}
        </div>
        
        {/* 手札表示（背面）*/}
        <div className="flex justify-center">
          <div className="flex -space-x-1 max-w-full overflow-hidden">
            {Array.from({ length: Math.min(player.hand?.length ?? 0, 12) }).map((_, index) => (
              <BackCard key={index} />
            ))}
            {(player.hand?.length ?? 0) > 12 && (
              <div className="text-xs text-gray-400 ml-2 self-center">
                +{(player.hand?.length ?? 0) - 12}
              </div>
            )}
          </div>
        </div>
        
        {/* 状態表示 */}
        <div className="mt-2 text-center">
          {player.passCount >= getMaxPassCount(options) && !player.isFinished && (
            <div className="text-red-400 text-xs font-bold">
              強制出し
            </div>
          )}
          {player.hand?.length === 1 && !player.isFinished && (
            <div className="text-yellow-400 text-xs font-bold">
              リーチ！
            </div>
          )}
        </div>
      </div>
    </div>
  );
};