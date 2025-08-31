import { useState } from 'react';
import { AppLayout } from './AppLayout';
import { GameControls } from './GameControls';
import { GameLog } from './GameLog';
import { GameResult } from './GameResult';
import { MobileControls } from './MobileControls';
import { convertGameStateToUI } from '../utils/uiAdapter';
import { GameState } from '../types/game';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { 
  Play, 
  Pause, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  FileText,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface NewGameBoardProps {
  gameState: GameState;
  gameSpeed: number;
  isPlaying: boolean;
  onAutoPlay: () => void;
  onPlayTurn: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onOptionsChange: (options: any) => void;
}

export function NewGameBoard({
  gameState,
  gameSpeed,
  isPlaying,
  onAutoPlay,
  onPlayTurn,
  onReset,
  onSpeedChange,
  onOptionsChange
}: NewGameBoardProps) {
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);

  if (gameState.gamePhase === 'finished') {
    return (
      <GameResult
        players={gameState.players}
        rankings={gameState.rankings}
        onNewGame={onReset}
      />
    );
  }

  // 既存のゲーム状態を新しいUIシステム用に変換
  const uiData = convertGameStateToUI(gameState);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* メインゲーム画面 */}
      <div className={`${gameState.gamePhase === 'playing' ? 'pb-20 md:pb-0' : ''}`}>
        <AppLayout
          players={uiData.players}
          board={uiData.board}
          gameInfo={uiData.gameInfo}
        />
      </div>

      {/* デスクトップ用上部固定コントロールバー */}
      <div className="hidden md:block absolute top-4 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-6xl px-4">
        <Collapsible
          open={!isControlsCollapsed}
          onOpenChange={(open) => setIsControlsCollapsed(!open)}
        >
          <div className="bg-neutral-900/95 backdrop-blur-sm rounded-lg border border-neutral-700 shadow-lg">
            {/* コンパクトコントロール（常に表示） */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                {/* 基本的な再生コントロール */}
                {gameState.gamePhase === 'playing' && (
                  <Button 
                    onClick={onAutoPlay} 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? '停止' : '再生'}
                  </Button>
                )}

                {/* ゲーム情報 */}
                <div className="flex items-center gap-4 text-sm text-neutral-300">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      gameState.gamePhase === 'playing' 
                        ? isPlaying ? 'bg-green-500' : 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`} />
                    <span>ターン {gameState.turn}</span>
                  </div>
                  <div>
                    現在: {gameState.players[gameState.currentPlayerIndex]?.name || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* ログ表示ボタン */}
                <Sheet open={isLogOpen} onOpenChange={setIsLogOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-neutral-200">
                      <FileText className="w-4 h-4" />
                      <span className="ml-1">ログ</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-96 bg-neutral-950 border-neutral-700">
                    <SheetHeader>
                      <SheetTitle className="text-neutral-100">ゲームログ</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 h-full">
                      <GameLog history={gameState.history} className="p-0" />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* 詳細コントロール展開ボタン */}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-neutral-200">
                    {isControlsCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    <span className="ml-1">
                      {isControlsCollapsed ? '展開' : '収納'}
                    </span>
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            {/* 詳細コントロール（折りたたみ可能） */}
            <CollapsibleContent>
              <div className="border-t border-neutral-700">
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
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* モバイル用コントロール */}
      <MobileControls
        gameState={gameState}
        gameSpeed={gameSpeed}
        isPlaying={isPlaying}
        onAutoPlay={onAutoPlay}
        onPlayTurn={onPlayTurn}
        onReset={onReset}
        onSpeedChange={onSpeedChange}
        onOptionsChange={onOptionsChange}
      />
    </div>
  );
}