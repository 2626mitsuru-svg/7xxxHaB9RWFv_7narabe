import { GameEvent } from '../types/game';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Clock, User, CreditCard } from 'lucide-react';

interface GameLogProps {
  history: GameEvent[];
  className?: string;
}

export function GameLog({ history, className = '' }: GameLogProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'play': return '🃏';
      case 'pass': return '⏭️';
      case 'eliminate': return '❌';
      case 'finish': return '🎉';
      default: return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'eliminate': return 'bg-red-900/20 text-red-300 border-red-800/30';
      case 'finish': return 'bg-green-900/20 text-green-300 border-green-800/30';
      case 'pass': return 'bg-yellow-900/20 text-yellow-300 border-yellow-800/30';
      case 'play': return 'bg-blue-900/20 text-blue-300 border-blue-800/30';
      default: return 'bg-neutral-900/20 text-neutral-300 border-neutral-800/30';
    }
  };

  const formatCardName = (card: any) => {
    if (!card) return '';
    const rankName = card.rank === 1 ? 'A' : 
                     card.rank === 11 ? 'J' : 
                     card.rank === 12 ? 'Q' : 
                     card.rank === 13 ? 'K' : 
                     card.rank.toString();
    return `${card.suit}${rankName}`;
  };

  return (
    <div className={`${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-700">
        <Clock className="w-4 h-4 text-neutral-400" />
        <h3 className="text-neutral-200 font-medium">ゲームログ</h3>
        <Badge variant="secondary" className="text-xs">
          {history.length}件
        </Badge>
      </div>
      
      <ScrollArea className="h-96">
        <div className="space-y-3 pr-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-neutral-500">ログはまだありません</p>
              <p className="text-neutral-600 text-sm mt-1">ゲームが開始されるとここに表示されます</p>
            </div>
          ) : (
            history
              .slice()
              .reverse() // 最新を上に表示
              .map((event, index) => (
                <div
                  key={history.length - index - 1}
                  className={`p-3 rounded-lg border transition-all hover:scale-[1.02] ${getActionColor(event.action)}`}
                >
                  {/* メインメッセージ */}
                  <div className="flex items-start gap-3">
                    <div className="text-lg flex-shrink-0 mt-0.5">
                      {getActionIcon(event.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-3 h-3 flex-shrink-0 opacity-60" />
                          <span className="text-xs font-medium truncate">
                            {event.playerId !== 'system' ? event.playerId : 'システム'}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono flex-shrink-0">
                          T{event.turn}
                        </Badge>
                      </div>
                      
                      <p className="text-sm leading-relaxed">{event.message}</p>
                      
                      {/* カード情報 */}
                      {event.card && (
                        <div className="mt-2 flex items-center gap-2">
                          <CreditCard className="w-3 h-3 opacity-60" />
                          <Badge variant="secondary" className="text-xs font-mono">
                            {formatCardName(event.card)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </ScrollArea>

      {/* フッター統計 */}
      {history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-neutral-700">
          <div className="grid grid-cols-2 gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>プレイ: {history.filter(h => h.action === 'play').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2  h-2 bg-yellow-500 rounded-full"></span>
              <span>パス: {history.filter(h => h.action === 'pass').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>上がり: {history.filter(h => h.action === 'finish').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>脱落: {history.filter(h => h.action === 'eliminate').length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}