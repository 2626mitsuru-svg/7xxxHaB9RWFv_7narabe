'use client';
import React, { useEffect } from 'react';
import { useSevensBridge } from './hooks/useSevensBridge';
import SevensGameBoard from './components/SevensGameBoard';

export default function App() {
  // ★ 無条件に先頭で呼ぶ
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

  useEffect(() => {
    if (gameState?.gamePhase === 'playing' && !isPlaying) {
      const t = setTimeout(() => autoPlay(), 1500);
      return () => clearTimeout(t);
    }
  }, [gameState?.gamePhase, isPlaying, autoPlay]);

  if (!gameState) {
    const { CPUSelector } = require('./components/CPUSelector');
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
