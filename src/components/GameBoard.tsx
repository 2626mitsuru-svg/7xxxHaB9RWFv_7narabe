import { GameState } from '../types/game';
import { CardGrid } from './CardGrid';
import { PlayerInfo } from './PlayerInfo';
import { GameControls } from './GameControls';
import { GameLog } from './GameLog';
import { GameResult } from './GameResult';

interface GameBoardProps {
  gameState: GameState;
  gameSpeed: number;
  isPlaying: boolean;
  onAutoPlay: () => void;
  onPlayTurn: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onOptionsChange: (options: any) => void;
}

export function GameBoard({
  gameState,
  gameSpeed,
  isPlaying,
  onAutoPlay,
  onPlayTurn,
  onReset,
  onSpeedChange,
  onOptionsChange
}: GameBoardProps) {
  if (gameState.gamePhase === 'finished') {
    return (
      <GameResult
        players={gameState.players}
        rankings={gameState.rankings}
        onNewGame={onReset}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-green-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Game info header */}
        <div className="text-center mb-4">
          <h1 className="text-white mb-2">七並べ観戦モード</h1>
          <div className="text-white/80 text-sm">
            ターン {gameState.turn} - {gameState.gamePhase === 'playing' ? '対戦中' : '待機中'}
          </div>
        </div>

        {/* Main game area */}
        <div className="relative flex justify-center mb-8">
          {/* Players positioned around the board */}
          {gameState.players.map(player => (
            <PlayerInfo
              key={player.id}
              player={player}
              isCurrentPlayer={gameState.players[gameState.currentPlayerIndex]?.id === player.id}
            />
          ))}

          {/* Card grid in the center */}
          <CardGrid board={gameState.board} />
        </div>

        {/* Controls and log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          
          <GameLog history={gameState.history} />
        </div>
      </div>
    </div>
  );
}