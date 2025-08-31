'use client';

import { useState } from 'react';
import { GameState, PlayerSpeechState } from '../types/game';
import { GameSpeed } from '../hooks/useSevensBridge';
import { BoardSevens } from './BoardSevens';
import { PlayerCard } from './PlayerCard';
import { GameControls } from './GameControls';
import { GameHeader } from './GameHeader';
import { GameResults } from './GameResults';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { getExpressionUrl, getPlayerPosition, handleImageError } from '../utils/gameDisplayHelpers';

interface SevensGameBoardProps {
  gameState: GameState;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  playerSpeeches: PlayerSpeechState;
  uiEffects?: any;
  onPlayTurn: () => void;
  onAutoPlay: () => void;
  onReset: () => void;
  onSpeedChange: (speed: GameSpeed) => void;
  getExpression: (playerId: string) => string;
  getExpressionUrl: (playerId: string) => string;
}

export function SevensGameBoard({
  gameState,
  isPlaying,
  gameSpeed,
  playerSpeeches,
  uiEffects,
  onPlayTurn,
  onAutoPlay,
  onReset,
  onSpeedChange,
  getExpression,
  getExpressionUrl,
}: SevensGameBoardProps) {
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  // 特定プレイヤーの発話を取得
  const getPlayerSpeech = (playerId: string): string | undefined => {
    const speech = playerSpeeches[playerId];
    return speech?.text;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 text-neutral-100 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-green-500 rounded-full blur-2xl"></div>
      </div>

      {/* プレイヤーカード（四隅固定配置、並列発話対応） */}
      {gameState.players.map((player, index) => {
        // プレイヤーの最後の行動を判定
        const lastAction = gameState.gameLog && gameState.gameLog.length > 0 ? 
          (() => {
            // 最新のログからこのプレイヤーの行動を探す
            for (let i = gameState.gameLog.length - 1; i >= 0; i--) {
              const log = gameState.gameLog[i];
              if (log.includes(player.name || `プレイヤー${index + 1}`)) {
                if (log.includes('パス')) return 'pass';
                if (log.includes('カードを出しました') || log.includes('を出しました')) return 'play';
                break;
              }
            }
            return undefined;
          })() : undefined;

        return (
          <PlayerCard
            key={player.id}
            player={player}
            isCurrentPlayer={gameState.players[gameState.currentPlayerIndex]?.id === player.id}
            isActive={!player.isEliminated && !player.isFinished}
            expression={getExpression(player.id)}
            speech={getPlayerSpeech(player.id)}
            getExpressionUrl={getExpressionUrl}
            onImageError={handleImageError}
            position={getPlayerPosition(index)}
            rankings={gameState.rankings}
            allPlayers={gameState.players}
            lastAction={lastAction}
          />
        );
      })}

      {/* メインゲームエリア - 中央配置 */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center space-y-6">
          <GameHeader 
            gameState={gameState}
            isPlaying={isPlaying}
            playerSpeeches={playerSpeeches}
          />

          {/* 盤面（常に中央固定） */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <BoardSevens gameState={gameState} uiEffects={uiEffects} />
          </div>

          {/* 盤面直下のコンテンツエリア（固定高さ） */}
          <div className="h-16 flex flex-col items-center justify-center">
            {/* 基本操作ボタン（ゲーム進行中） */}
            {gameState.gamePhase === 'playing' && (
              <div className="flex justify-center space-x-3">
                <Button
                  onClick={onAutoPlay}
                  variant="outline"
                  size="sm"
                  className="bg-neutral-800/50 border-neutral-600 text-neutral-300 hover:bg-neutral-700/50 hover:text-white text-xs px-3 py-1"
                >
                  {isPlaying ? '⏸️ 一時停止' : '▶️ 自動進行'}
                </Button>
                
                <Button
                  onClick={onReset}
                  variant="outline"
                  size="sm"
                  className="bg-neutral-800/50 border-neutral-600 text-neutral-300 hover:bg-neutral-700/50 hover:text-white text-xs px-3 py-1"
                >
                  🔄 リセット
                </Button>
              </div>
            )}

            {/* ゲーム終了時の結果表示（横並び） */}
            <GameResults gameState={gameState} onReset={onReset} />
          </div>
        </div>
      </div>

      {/* ゲームコントロールボタン（固定位置） */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <Dialog open={isControlModalOpen} onOpenChange={setIsControlModalOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30"
              size="lg"
            >
              ⚙️ ゲームコントロール
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ゲームコントロール</DialogTitle>
              <DialogDescription>
                ゲームの再生・停止、速度調整、リセットなどの操作を行えます。
              </DialogDescription>
            </DialogHeader>
            <GameControls
              isPlaying={isPlaying}
              gameSpeed={gameSpeed}
              onPlayTurn={onPlayTurn}
              onAutoPlay={onAutoPlay}
              onReset={onReset}
              onSpeedChange={onSpeedChange}
              gamePhase={gameState.gamePhase}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}