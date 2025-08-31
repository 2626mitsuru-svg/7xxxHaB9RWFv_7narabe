import { PlayerCard } from './PlayerCard';
import { BoardSevens } from './BoardSevens';
import type { PlayerViewModel, SevensBoardModel, GameInfoModel } from '../types/ui';

interface AppLayoutProps {
  players: [PlayerViewModel, PlayerViewModel, PlayerViewModel, PlayerViewModel]; // LU, RU, RD, LD
  board: SevensBoardModel;
  gameInfo: GameInfoModel;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ players, board, gameInfo }) => {
  const [pLU, pRU, pRD, pLD] = players;

  return (
    <div className="app-root fixed inset-0 grid place-items-center bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* 四隅プレイヤーゾーン - 内側に移動 */}
      <div className="corner lu absolute top-8 left-8 w-96 h-80 z-10 overflow-visible">
        <PlayerCard {...pLU} />
      </div>
      <div className="corner ru absolute top-8 right-8 w-96 h-80 z-10 overflow-visible">
        <PlayerCard {...pRU} />
      </div>
      <div className="corner rd absolute bottom-8 right-8 w-96 h-80 z-10 overflow-visible">
        <PlayerCard {...pRD} />
      </div>
      <div className="corner ld absolute bottom-8 left-8 w-96 h-80 z-10 overflow-visible">
        <PlayerCard {...pLD} />
      </div>

      {/* 中央盤面 - サイズそのまま */}
      <div className="board-center absolute inset-0 m-auto w-[min(50vw,600px)] h-[min(40vh,350px)] grid place-items-center z-5">
        <BoardSevens placed={board.placed} canPlace={board.canPlace} />
      </div>

      {/* ゲーム情報 - 上部中央 */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 bg-neutral-900/90 backdrop-blur-sm rounded-full px-4 py-2 border border-neutral-600">
        <div className="text-sm text-neutral-200 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-green-400`} />
            <span>ターン {gameInfo.turn}</span>
          </div>
          <div className="w-px h-4 bg-neutral-600" />
          <span className="text-yellow-300">{gameInfo.currentPlayer}</span>
        </div>
      </div>
    </div>
  );
};