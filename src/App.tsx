'use client';

import { useState, useEffect, useRef } from 'react';
import { useSevensBridge } from './hooks/useSevensBridge';
import { CPUSelector } from './components/CPUSelector';
import { SevensGameBoard } from './components/SevensGameBoard';

export default function App() {
  const {
    gameState,
    selectedCPUs,
    isPlaying,
    gameSpeed,
    playerSpeeches, // ★変更：PlayerSpeechState型に対応
    uiEffects,
    selectCPUs,
    startGame,
    playTurn,
    autoPlay,
    resetGame,
    setGameSpeed,
    getExpression,
    getExpressionUrl
  } = useSevensBridge();

  // ゲーム開始後に自動でオートプレイを開始
  useEffect(() => {
    if (gameState && gameState.gamePhase === 'playing' && !isPlaying) {
      const timer = setTimeout(() => {
        autoPlay();
      }, 1500); // 1.5秒後に自動開始
      return () => clearTimeout(timer);
    }
  }, [gameState?.gamePhase, isPlaying, autoPlay]);

  // ゲーム未開始の場合はCPU選択画面
  if (!gameState) {
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
      playerSpeeches={playerSpeeches} // ★変更：並列発話対応
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