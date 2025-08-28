import { Player } from '../types/game';
import { getCPUById } from '../data/cpuPlayers';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Trophy, Medal, Award } from 'lucide-react';

interface GameResultProps {
  players: Player[];
  rankings: string[];
  onNewGame: () => void;
}

export function GameResult({ players, rankings, onNewGame }: GameResultProps) {
  // Create final rankings including eliminated players
  const finalRankings = [...rankings];
  const eliminatedPlayers = players.filter(p => p.isEliminated && !rankings.includes(p.id));
  finalRankings.push(...eliminatedPlayers.map(p => p.id));

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-orange-600" />;
      default: return <div className="w-6 h-6 flex items-center justify-center text-gray-600">{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-50 border-yellow-200';
      case 2: return 'bg-gray-50 border-gray-200'; 
      case 3: return 'bg-orange-50 border-orange-200';
      default: return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="mb-4">ゲーム結果</h2>
        <Button onClick={onNewGame} size="lg">
          新しいゲーム
        </Button>
      </div>

      <div className="space-y-4">
        {finalRankings.map((playerId, index) => {
          const player = players.find(p => p.id === playerId);
          const cpuData = getCPUById(playerId);
          const rank = index + 1;
          
          if (!player) return null;

          return (
            <Card key={playerId} className={`p-4 ${getRankColor(rank)} border-2`}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getRankIcon(rank)}
                  <span className="text-xl">{rank}位</span>
                </div>
                
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-3xl">{player.avatar}</div>
                  <div>
                    <div className="text-lg">{player.name}</div>
                    <div className="text-sm text-gray-600">{cpuData?.description}</div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-sm">
                    <span className="text-gray-600">残り手札:</span>
                    <span className="ml-1">{player.handCount}枚</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">使用パス:</span>
                    <span className="ml-1">{player.passCount}回</span>
                  </div>
                  {player.isEliminated && (
                    <div className="text-xs text-red-600">脱落</div>
                  )}
                  {player.handCount === 0 && (
                    <div className="text-xs text-green-600">完走</div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Statistics */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="mb-4">統計情報</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">完走者:</span>
            <span className="ml-2">{players.filter(p => p.handCount === 0).length}人</span>
          </div>
          <div>
            <span className="text-gray-600">脱落者:</span>
            <span className="ml-2">{players.filter(p => p.isEliminated).length}人</span>
          </div>
          <div>
            <span className="text-gray-600">平均パス使用:</span>
            <span className="ml-2">
              {(players.reduce((sum, p) => sum + p.passCount, 0) / players.length).toFixed(1)}回
            </span>
          </div>
          <div>
            <span className="text-gray-600">最多パス使用:</span>
            <span className="ml-2">{Math.max(...players.map(p => p.passCount))}回</span>
          </div>
        </div>
      </div>
    </div>
  );
}