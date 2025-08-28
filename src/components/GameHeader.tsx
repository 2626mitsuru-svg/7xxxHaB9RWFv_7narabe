import React from 'react';
import { GameState, PlayerSpeechState } from '../types/game';
import { getCPUColor } from '../utils/cpuColors';

interface GameHeaderProps {
  gameState: GameState;
  isPlaying: boolean;
  playerSpeeches: PlayerSpeechState;
}

export function GameHeader({ gameState, isPlaying, playerSpeeches }: GameHeaderProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="mb-6 text-center">
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-neutral-400">ターン:</span>
          <span className="font-bold text-white">{gameState.turn}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-neutral-400">現在:</span>
          {currentPlayer && (
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getCPUColor(currentPlayer.id).primary }}
              />
              <span 
                className="font-bold"
                style={{ color: getCPUColor(currentPlayer.id).primary }}
              >
                {currentPlayer.name}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-neutral-400">状態:</span>
          <span className={`font-bold ${isPlaying ? 'text-green-400' : 'text-yellow-400'}`}>
            {isPlaying ? '自動進行中' : '一時停止'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-neutral-400">デッキ:</span>
          <span className="font-bold text-blue-400">52枚</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-neutral-400">発話中:</span>
          <span className="font-bold text-green-400">
            {Object.values(playerSpeeches).filter(speech => speech !== null).length}/4
          </span>
        </div>
      </div>
    </div>
  );
}