'use client';

import { useState, useEffect, useRef } from 'react';
import { GameState, Card, Suit } from '../types/game';
import { GAP, isEmptyCell } from '../types/board';
import { getCPUColor, generateCardBadge, getCardAnimationVars, getSystemColor } from '../utils/cpuColors';

interface BoardSevensProps {
  gameState: GameState;
  uiEffects?: any; // UIエフェクト状態
}

export function BoardSevens({ gameState, uiEffects }: BoardSevensProps) {
  const [cardAnimations, setCardAnimations] = useState<Set<string>>(new Set());
  const [sevenAnimations, setSevenAnimations] = useState<Set<string>>(new Set());
  const [lastMoveNo, setLastMoveNo] = useState<number>(0);

  // cardMetaベースの新しく配置されたカードの検知
  useEffect(() => {
    if (!gameState || !gameState.cardMeta || !gameState.nextMoveNo) return;

    // 前回より手数が増えていたら新しいカードがある
    if (gameState.nextMoveNo > lastMoveNo) {
      // 最新の手数でアニメーション対象を探す
      const latestMoveNo = gameState.nextMoveNo - 1;
      
      Object.entries(gameState.cardMeta).forEach(([suit, metaRow]) => {
        metaRow.forEach((meta, index) => {
          if (meta && meta.move === latestMoveNo) {
            const cardKey = `${suit}-${index}`;
            const rank = index + 1;
            
            // アニメーション適用
            if (rank === 7) {
              setSevenAnimations(prev => new Set([...prev, cardKey]));
              setTimeout(() => {
                setSevenAnimations(prev => {
                  const next = new Set(prev);
                  next.delete(cardKey);
                  return next;
                });
              }, 800);
            } else {
              setCardAnimations(prev => new Set([...prev, cardKey]));
              setTimeout(() => {
                setCardAnimations(prev => {
                  const next = new Set(prev);
                  next.delete(cardKey);
                  return next;
                });
              }, 600);
            }
          }
        });
      });
      
      setLastMoveNo(gameState.nextMoveNo);
    }
  }, [gameState?.nextMoveNo, gameState?.cardMeta, lastMoveNo]);

  const suits: Suit[] = ['♠', '♥', '♦', '♣'];

  const getSuitColor = (suit: Suit): string => {
    return suit === '♥' || suit === '♦' ? 'text-red-500' : 'text-gray-800 dark:text-gray-200';
  };

  const renderCard = (cell: Card | typeof GAP | null, suitKey: Suit, index: number) => {
    const cardKey = `${suitKey}-${index}`;
    const rank = index + 1;
    
    // cardMetaから確定情報を取得
    const cardMeta = gameState.cardMeta?.[suitKey]?.[index];
    
    // アニメーションクラスの決定
    const isAnimating = cardAnimations.has(cardKey);
    const isSevenAnimating = sevenAnimations.has(cardKey);
    const animationClass = isSevenAnimating 
      ? 'card-seven-animation' 
      : isAnimating 
        ? 'card-place-animation' 
        : '';

    // カード配置者の色情報（cardMetaベース）
    let cardStyle: React.CSSProperties = {};
    if (cardMeta?.playedBy) {
      const animationVars = getCardAnimationVars(cardMeta.playedBy);
      cardStyle = { ...cardStyle, ...animationVars };
    }

    if (cell === null) {
      // 空のセル
      return (
        <div
          key={`${suitKey}-${index}`}
          className="w-12 h-16 border border-dashed border-gray-400 dark:border-gray-600 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-800"
        >
          <span className="text-xs text-gray-400">{rank}</span>
        </div>
      );
    }

    if (cell === GAP) {
      // GAP（プレースホルダー）- カード配置可能な空きスロット
      return (
        <div
          key={`${suitKey}-${index}`}
          className="w-12 h-16 border-2 border-dashed border-green-400 dark:border-green-500 rounded flex items-center justify-center bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">{rank}</span>
        </div>
      );
    }

    // Joker廃止により、この部分は削除

    // 通常のカード
    const rankDisplay = rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : rank.toString();
    
    return (
      <div
        key={`${suitKey}-${index}`}
        className={`relative w-12 h-16 border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-100 flex flex-col items-center justify-center shadow-sm ${animationClass}`}
        style={cardStyle}
      >
        <span className={`text-lg ${getSuitColor(suitKey as Suit)}`}>
          {suitKey}
        </span>
        <span className={`text-xs font-bold ${getSuitColor(suitKey as Suit)}`}>
          {rankDisplay}
        </span>
        
        {/* ★3) 通常カードのバッジ表示：個人手数を優先 */}
        {cardMeta && (
          <div
            className="card-badge"
            style={{
              backgroundColor: cardMeta.playedBy === 'system' 
                ? getSystemColor().primary 
                : getCPUColor(cardMeta.playedBy).primary,
              color: '#ffffff',
            }}
            aria-label={cardMeta.dumped ? 'dobon-dumped' : `player-move-${cardMeta.playerMove ?? cardMeta.move}`}
          >
            {/* ★変更後：dumped優先、次にplayerMove、最後にmove（後方互換） */}
            {cardMeta.dumped ? '⚰️' : String(cardMeta.playerMove ?? cardMeta.move)}
          </div>
        )}
      </div>
    );
  };

  // 安全なゲーム状態チェック
  if (!gameState || !gameState.board) {
    return (
      <div className="flex flex-col items-center p-4">
        <div className="text-center text-gray-500">
          ゲーム盤面を読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      {suits.map((suit) => (
        <div key={suit} className="flex space-x-1">
          {gameState.board[suit]?.map((cell, index) => 
            renderCard(cell, suit, index)
          ) || Array(13).fill(null).map((_, index) => 
            renderCard(null, suit, index)
          )}
        </div>
      ))}
    </div>
  );
}