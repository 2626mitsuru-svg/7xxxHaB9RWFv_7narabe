import { useState, useEffect, useRef } from 'react';
import { GameState } from '../types/game';
import { getCPUColor } from '../utils/cpuColors';
import { Button } from './ui/button';

interface GameResultsProps {
  gameState: GameState;
  onReset?: () => void;
}

export function GameResults({ gameState, onReset }: GameResultsProps) {
  if (gameState.gamePhase !== 'finished') {
    return null;
  }

  return (
    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
      <div className="flex items-center justify-center space-x-8">
        {/* ゲーム終了タイトル */}
        <h2 className="text-xl font-bold text-white">🎉 ゲーム終了！</h2>
        
        {/* 順位表示（横並び） */}
        <div className="flex items-center space-x-6">
          {gameState.rankings.slice(0, 3).map((playerId, index) => {
            const player = gameState.players.find(p => p.id === playerId);
            const cpuColor = getCPUColor(playerId);
            const medals = ['🥇', '🥈', '🥉'];
            return player ? (
              <div key={playerId} className="flex items-center space-x-2">
                <span className="text-xl">{medals[index]}</span>
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cpuColor.primary }}
                  />
                  <span 
                    className="font-bold text-white text-sm"
                  >
                    {player.name}
                  </span>
                </div>
              </div>
            ) : null;
          })}
        </div>
        
        {/* リセットボタン */}
        {onReset && (
          <Button
            onClick={onReset}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm"
          >
            🔄 リセット
          </Button>
        )}
      </div>
    </div>
  );
}