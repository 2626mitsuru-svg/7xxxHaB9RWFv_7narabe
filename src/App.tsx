'use client';

import React, { useEffect } from 'react';
import { useSevensBridge } from './hooks/useSevensBridge';
import SevensGameBoard from './components/SevensGameBoard'; // ← default輸入に統一

export default function App() {
  // ★ フックはコンポーネント冒頭で無条件に呼ぶ
  const {
    gameState,
    selectedCPUs,
    isPlaying,
    gameSpeed,
    playerSpeeches,
    uiEffects,
    selectCPUs,
    startGame,
    playTurn,
    autoPlay,
    resetGame,
    setGameSpeed,
    getExpression,
    getExpressionUrl,
  } = useSevensBridge();

  // ゲーム開始後に自動でオートプレイを開始
  useEffect(() => {
    if (gameState && gameState.gamePhase === 'playing' && !isPlaying) {
      const timer = setTimeout(() => {
        autoPlay();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState?.gamePhase, isPlaying, autoPlay]);

  // ゲーム未開始の場合はCPU選択画面
  if (!gameState) {
    const { CPUSelector } = require('./components/CPUSelector'); // 動的importでもOK
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="w-full max-w-6xl">
          <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-700">
            <CPUSelector
              selectedCPUs={selectedCPUs}
              onSelect={selectCPUs}
              onStartGame={startGame}
            />
          </div>
        </div>
      </div>
    );
  }

  // ゲーム進行中はゲームボード表示
  return (
    <SevensGameBoard
      gameState={gameState}
      isPlaying={isPlaying}
      gameSpeed={gameSpeed}
      playerSpeeches={playerSpeeches}
      uiEffects={uiEffects}
      onPlayTurn={playTurn}
      onAutoPlay={autoPlay}
      onReset={resetGame}
      onSpeedChange={setGameSpeed}
      getExpression={getExpression}
      getExpressionUrl={getExpressionUrl}
    />
  );
}
