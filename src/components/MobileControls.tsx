import React from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { GameControls } from './GameControls';
import { GameLog } from './GameLog';
import { GameState } from '../types/game';
import { 
  Play, 
  Pause, 
  Menu, 
  FileText,
  Settings
} from 'lucide-react';

interface MobileControlsProps {
  gameState: GameState;
  gameSpeed: number;
  isPlaying: boolean;
  onAutoPlay: () => void;
  onPlayTurn: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onOptionsChange: (options: any) => void;
}

export function MobileControls({
  gameState,
  gameSpeed,
  isPlaying,
  onAutoPlay,
  onPlayTurn,
  onReset,
  onSpeedChange,
  onOptionsChange
}: MobileControlsProps) {
  return (
    <div className="md:hidden">
      {/* モバイル用固定ボトムバー */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/95 backdrop-blur-sm border-t border-neutral-700">
        <div className="flex items-center justify-between p-3">
          {/* 再生コントロール */}
          <div className="flex items-center gap-2">
            {gameState.gamePhase === 'playing' && (
              <Button 
                onClick={onAutoPlay} 
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            )}
          </div>

          {/* 中央：ゲーム状態 */}
          <div className="flex-1 text-center">
            <div className="text-sm text-neutral-300">
              T{gameState.turn} | {gameState.players[gameState.currentPlayerIndex]?.name || 'N/A'}
            </div>
            <div className={`text-xs ${
              gameState.gamePhase === 'playing' 
                ? isPlaying ? 'text-green-400' : 'text-yellow-400'
                : 'text-gray-400'
            }`}>
              {gameState.gamePhase === 'playing' 
                ? isPlaying ? '自動進行中' : '一時停止中'
                : '待機中'
              }
            </div>
          </div>

          {/* 右側：メニュー */}
          <div className="flex items-center gap-2">
            {/* ログ表示 */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-neutral-400">
                  <FileText className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] bg-neutral-950 border-neutral-700">
                <SheetHeader>
                  <SheetTitle className="text-neutral-100">ゲームログ</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-hidden">
                  <GameLog history={gameState.history} className="p-0 h-full" />
                </div>
              </SheetContent>
            </Sheet>

            {/* 設定メニュー */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-neutral-400">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh] bg-neutral-950 border-neutral-700">
                <SheetHeader>
                  <SheetTitle className="text-neutral-100 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    コントロール & 設定
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-auto">
                  <GameControls
                    isPlaying={isPlaying}
                    gameSpeed={gameSpeed}
                    gamePhase={gameState.gamePhase}
                    options={gameState.options}
                    onAutoPlay={onAutoPlay}
                    onPlayTurn={onPlayTurn}
                    onReset={onReset}
                    onSpeedChange={onSpeedChange}
                    onOptionsChange={onOptionsChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}