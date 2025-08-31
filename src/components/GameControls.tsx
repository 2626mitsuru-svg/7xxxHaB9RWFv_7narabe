import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { GameSpeed, GAME_SPEEDS } from '../hooks/useSevensBridge';

interface GameControlsProps {
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  onPlayTurn: () => void;
  onAutoPlay: () => void;
  onReset: () => void;
  onSpeedChange: (speed: GameSpeed) => void;
  gamePhase: 'playing' | 'finished';
}

export function GameControls({
  isPlaying,
  gameSpeed,
  onPlayTurn,
  onAutoPlay,
  onReset,
  onSpeedChange,
  gamePhase,
}: GameControlsProps) {
  const getCurrentSpeedLabel = () => {
    return gameSpeed.label;
  };

  const handleSpeedChange = (values: number[]) => {
    const newValue = values[0];
    const closestSpeed = GAME_SPEEDS.reduce((prev, curr) => {
      return Math.abs(curr.value - newValue) < Math.abs(prev.value - newValue) ? curr : prev;
    });
    onSpeedChange(closestSpeed);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* モーダル内なのでタイトルは不要（DialogTitleで表示済み） */}
      
      {/* メイン操作ボタン */}
      <div className="flex space-x-3">
        {gamePhase === 'playing' && (
          <>
            <Button
              onClick={onPlayTurn}
              disabled={isPlaying}
              variant="outline"
              className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
            >
              🎯 1手進む
            </Button>
            
            <Button
              onClick={onAutoPlay}
              className={`
                ${isPlaying 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }
              `}
            >
              {isPlaying ? '⏸️▶️ 一時停止・進行' : '▶️ 自動進行'}
            </Button>
          </>
        )}
        
        <Button
          onClick={onReset}
          variant="outline"
          className="border-orange-500 text-orange-400 hover:bg-orange-500/20"
        >
          🔄 リセット
        </Button>
      </div>

      {/* 速度調整 */}
      <div className="w-full max-w-xs space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">ゲーム速度:</span>
          <span className="text-sm font-bold text-foreground">
            {getCurrentSpeedLabel()}
          </span>
        </div>
        
        <Slider
          value={[gameSpeed.value]}
          onValueChange={handleSpeedChange}
          min={100}
          max={2000}
          step={100}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>高速</span>
          <span>低速</span>
        </div>
      </div>

      {/* 現在の状態表示 */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-1">現在の状態</div>
        <div className={`text-sm font-bold ${
          gamePhase === 'finished' 
            ? 'text-yellow-600' 
            : isPlaying 
              ? 'text-green-600' 
              : 'text-blue-600'
        }`}>
          {gamePhase === 'finished' 
            ? '🏁 ゲーム終了' 
            : isPlaying 
              ? '⏩ 自動進行中' 
              : '⏸️ 待機中'
          }
        </div>
      </div>

      {/* 操作説明 */}
      <div className="text-xs text-muted-foreground text-center space-y-1 max-w-xs">
        <p>• 1手進む: 次の1手だけを実行</p>
        <p>• 自動進行: ゲーム終了まで自動で進行</p>
        <p>• 速度調整でテンポを変更できます</p>
      </div>
    </div>
  );
}