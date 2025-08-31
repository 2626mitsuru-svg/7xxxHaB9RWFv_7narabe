'use client';

import React, { useState, useEffect, useRef } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback'; // 先読み＋クロスフェード画像
import { Player } from '../types/game';
import { getCPUColor, getPlayerBorderColor } from '../utils/cpuColors';

// ターン切り替え制御用のグローバル型定義
declare global {
  interface Window {
    turnChangeController?: {
      lastTurnChange: number;
      activePlayerId: string | null;
    };
  }
}

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer: boolean;
  isActive: boolean;
  expression: string;
  speech?: string;
  getExpressionUrl: (playerId: string) => string;
  onImageError?: (event: SyntheticEvent<HTMLImageElement>) => void;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  rankings: string[]; // 順位配列
  allPlayers?: Player[]; // 他人の手札枚数判定用
  lastAction?: string; // 最後の行動（パス判定用）
}

export function PlayerCard({
  player,
  isCurrentPlayer,
  isActive,
  expression,
  speech,
  getExpressionUrl,
  onImageError,
  position,
  rankings,
  allPlayers = [],
  lastAction,
}: PlayerCardProps) {
  const cpuColor = getCPUColor(player.id);
  const borderShadow = getPlayerBorderColor(player.id, isCurrentPlayer || isActive);

  // ★ 安全に手札枚数を取得
  const handCount = player.handCount ?? player.hand?.length ?? 0;

  // ==== リアクション絵文字（二重表示防止を強化） ====
  const [isReactionVisible, setIsReactionVisible] = useState(false);
  const [isReactionAnimating, setIsReactionAnimating] = useState(false);
  const [isReactionFadingOut, setIsReactionFadingOut] = useState(false);
  const [previousEmoji, setPreviousEmoji] = useState<string>('');

  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // デバウンス用
  const lastReactionTimeRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ★ 追加：同じ絵文字の重複発火を抑止するフラグ
  const lastShownEmojiRef = useRef<string>('');
  const isShowingRef = useRef<boolean>(false);

  // ==== ターン切り替え制御 ====
  useEffect(() => {
    if (!window.turnChangeController) {
      window.turnChangeController = {
        lastTurnChange: 0,
        activePlayerId: null,
      };
    }
  }, []);


  // デバッグ: プレイヤー状態の変化を追跡
  const prevPlayerStateRef = useRef<{
    isCurrentPlayer: boolean;
    isFinished: boolean;
    isEliminated: boolean;
    rankIndex: number;
  } | null>(null);

  useEffect(() => {
    const currentState = {
      isCurrentPlayer,
      isFinished: player.isFinished,
      isEliminated: player.isEliminated,
      rankIndex: rankings.indexOf(player.id),
    };

    if (prevPlayerStateRef.current) {
      const prev = prevPlayerStateRef.current;
      const stateChanges: string[] = [];
      let isTurnChange = false;

      if (prev.isCurrentPlayer !== currentState.isCurrentPlayer) {
        stateChanges.push(`turn: ${prev.isCurrentPlayer} → ${currentState.isCurrentPlayer}`);
        isTurnChange = true;
      }
      if (prev.isFinished !== currentState.isFinished) {
        stateChanges.push(`finished: ${prev.isFinished} → ${currentState.isFinished}`);
      }
      if (prev.isEliminated !== currentState.isEliminated) {
        stateChanges.push(`eliminated: ${prev.isEliminated} → ${currentState.isEliminated}`);
      }
      if (prev.rankIndex !== currentState.rankIndex) {
        stateChanges.push(`rank: ${prev.rankIndex} → ${currentState.rankIndex}`);
      }

      // ターン切り替え時の重複制御
      if (isTurnChange) {
        const now = Date.now();
        const global = window.turnChangeController!;
        if (currentState.isCurrentPlayer) {
          // ターン開始側に優先権
          global.lastTurnChange = now;
          global.activePlayerId = player.id;
          console.log(`[ターン制御] ${player.name}: ターン開始を記録 (優先)`);
        } else {
          // 終了側は新しい開始が直近なら抑制
          if (now - global.lastTurnChange < 100 && global.activePlayerId && global.activePlayerId !== player.id) {
            console.log(
              `[ターン制御] ${player.name}: ターン終了リアクションを抑制 (${global.activePlayerId}のターン開始を優先)`,
            );
            prevPlayerStateRef.current = currentState; // 状態だけ更新
            return;
          }
        }
      }

      if (stateChanges.length > 0) {
        console.log(`[プレイヤー状態変化] ${player.name}: ${stateChanges.join(', ')}`);
      }
    }

    prevPlayerStateRef.current = currentState;
  }, [isCurrentPlayer, player.isFinished, player.isEliminated, rankings, player.name]);

// ★ 1122踏襲：一時絵文字は GameState 側でTTL管理。
// PlayerCard は player.reactionEmoji の有無だけでアニメ制御する。
const tempEmoji = player.reactionEmoji ?? '';

// 絵文字バブルの enter → idle → leave の簡易アニメ
useEffect(() => {
  // タイマー初期化
  if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
  if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

  if (tempEmoji) {
    // 表示開始
    isShowingRef.current = true;
    lastShownEmojiRef.current = tempEmoji;
    setIsReactionVisible(true);
    setIsReactionAnimating(true);
    setIsReactionFadingOut(false);

    // 1122と同等の見え方（ポップ300ms → 待機 → フェード開始→非表示）
    reactionTimeoutRef.current = setTimeout(() => setIsReactionAnimating(false), 300);
    fadeTimeoutRef.current = setTimeout(() => setIsReactionFadingOut(true), 2300);
    hideTimeoutRef.current = setTimeout(() => {
      setIsReactionVisible(false);
      setIsReactionFadingOut(false);
      isShowingRef.current = false;
    }, 2500);
  } else {
    // 絵文字が消えたら直ちに非表示（TTLは上流で終了済み）
    setIsReactionVisible(false);
    setIsReactionAnimating(false);
    setIsReactionFadingOut(false);
    isShowingRef.current = false;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tempEmoji]);


  // クリーンアップ
  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  // ==== 順位スタイル ====
  const getRankStyleClass = () => {
    if (player.isEliminated) {
      return 'player-card-eliminated';
    }
    if (player.isFinished && rankings.length > 0) {
      const playerRankIndex = rankings.indexOf(player.id);
      if (playerRankIndex !== -1) {
        const rank = playerRankIndex + 1;
        switch (rank) {
          case 1:
            return 'player-card-rank-1st';
          case 2:
            return 'player-card-rank-2nd';
          case 3:
            return 'player-card-rank-3rd';
          case 4:
            return 'player-card-rank-4th';
          default:
            return '';
        }
      }
    }
    return '';
  };

  const rankStyleClass = getRankStyleClass();

  // ==== 位置スタイル（固定配置） ====
  const positionStyles = {
    'top-left': 'fixed top-12 left-12',
    'top-right': 'fixed top-12 right-12',
    'bottom-left': 'fixed bottom-12 left-12',
    'bottom-right': 'fixed bottom-12 right-12',
  };

  // ① 表情エリア（レイアウト保持）
  const ExpressionArea = () => (
    <div className="w-40 h-40 opacity-0 pointer-events-none">{/* スペーサー */}</div>
  );

  // ==== 浮遊する表情円（画像フェードは子imgのみ／親はフェードさせない） ====
// PlayerCard.tsx 内：FloatingExpressionArea を全置換
const FloatingExpressionArea = () => {
  // reactionEmoji が来ている間だけ表示（上流がTTLで消す）
   const shouldShowReaction = isReactionVisible && !!tempEmoji;


  // data-state を一方向に遷移させて単発アニメにする
  const state: 'hidden' | 'enter' | 'idle' | 'leave' =
    !shouldShowReaction
      ? 'hidden'
      : isReactionAnimating
      ? 'enter'
      : isReactionFadingOut
      ? 'leave'
      : 'idle';

  return (
    <div className="relative">
      {/* 表情“丸”を相対基準にする（ここを基準に絵文字を絶対配置） */}
      <div
        className="w-40 h-40 rounded-full border-4 overflow-hidden bg-white expression-border relative"
        style={{ borderColor: cpuColor.primary, zIndex: 50 }}
      >
        <ImageWithFallback
          src={getExpressionUrl(player.id)}
          alt={`${player.name}の表情`}
          className="w-full h-full object-cover"
          data-player-id={player.id}
          duration={180}
          onError={onImageError as any}
        />

        {/* 絵文字バブル：表情丸の右上に固定（常時マウント＋data-state制御） */}
        <div
          className="reaction-bubble"
          data-state={state}
          style={{ top: -6, right: -6, zIndex: 60 }}
        >
          <span className="inline-block">{shouldShowReaction ? tempEmoji : ''}</span>
        </div>
      </div>
    </div>
  );
};


  // ② 情報エリア（レイアウト保持）
  const InfoArea = () => <div className="w-32 h-20 opacity-0 pointer-events-none" />;

  // 浮遊する情報エリア
  const FloatingInfoArea = () => (
    <div
      className="bg-white/95 dark:bg-gray-800/95 rounded-xl p-3 border-2 backdrop-blur-sm info-border"
      style={{ borderColor: cpuColor.primary }}
    >
      <div className="space-y-1">
        <div className="font-bold text-lg" style={{ color: cpuColor.primary }}>
          {player.name}
          {/* 順位 */}
          {player.isFinished &&
            rankings.length > 0 &&
            (() => {
              const rankIndex = rankings.indexOf(player.id);
              if (rankIndex !== -1) {
                const rank = rankIndex + 1;
                const rankEmoji = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏁';
                return <span className="ml-2">{rankEmoji}</span>;
              }
              return null;
            })()}
          {/* ドボン表示 */}
          {player.isEliminated && <span className="ml-2">⚰️</span>}
        </div>
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">残り {handCount}枚 パス </span>
          <span
            className={`font-bold ${player.passCount >= 3 ? 'text-red-500' : ''}`}
            style={{ color: player.passCount >= 3 ? '#ef4444' : cpuColor.primary }}
          >
            {player.passCount}/3
          </span>
        </div>
      </div>
    </div>
  );

  // ③ 手札エリア（残り枚数バー）
  const HandArea = () => {
    const maxCards = 13;
    const cardWidth = 8;
    return (
      <div className="p-2">
        <div className="flex items-center justify-center space-x-0.5">
          {Array.from({ length: maxCards }, (_, i) => (
            <div
              key={i}
              className={`h-6 rounded-sm ${
                i < handCount ? 'bg-gray-700 dark:bg-gray-300' : 'bg-gray-200 dark:bg-gray-600'
              }`}
              style={{ width: `${cardWidth}px` }}
            />
          ))}
        </div>
      </div>
    );
  };

  // ④ 吹き出しエリア（表情方向にしっぽ）
  const SpeechArea = () => {
    if (!speech) return null;

    const getBubbleTailClasses = () => {
      switch (position) {
        case 'top-left':
          return 'before:absolute before:content-[""] before:w-0 before:h-0 before:border-8 before:border-transparent before:border-b-white dark:before:border-b-gray-800 before:-top-4 before:left-6 before:z-10';
        case 'top-right':
          return 'before:absolute before:content-[""] before:w-0 before:h-0 before:border-8 before:border-transparent before:border-b-white dark:before:border-b-gray-800 before:-top-4 before:right-6 before:z-10';
        case 'bottom-left':
          return 'before:absolute before:content-[""] before:w-0 before:h-0 before:border-8 before:border-transparent before:border-t-white dark:before:border-t-gray-800 before:-bottom-4 before:left-6 before:z-10';
        case 'bottom-right':
          return 'before:absolute before:content-[""] before:w-0 before:h-0 before:border-8 before:border-transparent before:border-t-white dark:before:border-t-gray-800 before:-bottom-4 before:right-6 before:z-10';
        default:
          return '';
      }
    };

    return (
      <div
        className={`bg-white dark:bg-gray-800 border-2 rounded-xl p-3 shadow-lg max-w-xs speech-tail speech-bubble relative ${getBubbleTailClasses()}`}
        style={{ borderColor: cpuColor.primary, position: 'relative', zIndex: 70 }} // ★ 最前面
      >
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-tight">{speech}</p>
      </div>
    );
  };

  // 位置別レイアウト（表情と情報の“実体”は浮遊レイヤにあり、ここはスペーサー）
  const getLayoutByPosition = () => {
    switch (position) {
      case 'top-left':
        return (
          <div>
            <div className="flex items-center space-x-3 mb-4" style={{ height: '70px' }}>
              <ExpressionArea />
              <InfoArea />
            </div>
            <SpeechArea />
            <HandArea />
          </div>
        );
      case 'top-right':
        return (
          <div>
            <div className="flex items-center space-x-3 mb-4" style={{ height: '70px' }}>
              <InfoArea />
              <ExpressionArea />
            </div>
            <SpeechArea />
            <HandArea />
          </div>
        );
      case 'bottom-left':
        return (
          <div>
            <HandArea />
            <SpeechArea />
            <div className="flex items-center space-x-3 mt-4" style={{ height: '70px' }}>
              <ExpressionArea />
              <InfoArea />
            </div>
          </div>
        );
      case 'bottom-right':
        return (
          <div>
            <HandArea />
            <SpeechArea />
            <div className="flex items-center space-x-3 mt-4" style={{ height: '70px' }}>
              <InfoArea />
              <ExpressionArea />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // 枠スタイル（親には transition を当てない＝カード全体がフェードしない）
  const containerStyle = {
    background: `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(${cpuColor.rgb}, 0.15) 100%)`,
    border: `4px solid ${cpuColor.primary}`,
    borderRadius: '20px',
    padding: '20px',
    backdropFilter: 'blur(8px)',
    opacity: isCurrentPlayer || isActive ? 1 : 0.75,
    maxWidth: '380px',
    boxShadow: borderShadow,
  } as const;

  // 浮遊する表情円の位置
  const getFloatingExpressionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 50,
      pointerEvents: 'none' as const,
    };
    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: '-46px', left: '-10px' };
      case 'top-right':
        return { ...baseStyle, top: '-46px', right: '-10px' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '-46px', left: '-10px' };
      case 'bottom-right':
        return { ...baseStyle, bottom: '-46px', right: '-10px' };
      default:
        return baseStyle;
    }
  };

  // 浮遊する情報エリアの位置
  const getFloatingInfoStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 55,
      pointerEvents: 'none' as const,
    };
    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: '20px', left: '170px' };
      case 'top-right':
        return { ...baseStyle, top: '20px', right: '170px' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '20px', left: '170px' };
      case 'bottom-right':
        return { ...baseStyle, bottom: '20px', right: '170px' };
      default:
        return baseStyle;
    }
  };

  // ターンマーク位置
  const getTurnMarkerStyle = () => {
    const baseStyle = { position: 'absolute' as const, zIndex: 60 };
    switch (position) {
      case 'top-left':
        return { ...baseStyle, bottom: '-20px', right: '-20px' };
      case 'top-right':
        return { ...baseStyle, bottom: '-20px', left: '-20px' };
      case 'bottom-left':
        return { ...baseStyle, top: '-20px', right: '-20px' };
      case 'bottom-right':
        return { ...baseStyle, top: '-20px', left: '-20px' };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      className={`${positionStyles[position]} z-10 ${rankStyleClass} ${
        isCurrentPlayer ? 'player-card-thinking' : isActive ? 'player-card-active' : ''
      }`}
      style={containerStyle}
    >
      {/* メインレイアウト（スペーサー） */}
      {getLayoutByPosition()}

      {/* 浮遊する表情円＋リアクション欄 */}
      <div style={getFloatingExpressionStyle()}>
        <FloatingExpressionArea />
      </div>

      {/* 浮遊する情報エリア */}
      <div style={getFloatingInfoStyle()}>
        <FloatingInfoArea />
      </div>

      {/* ターンマーク ▶ */}
      {isCurrentPlayer && (
        <div style={getTurnMarkerStyle()} className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg">
          <div className="w-full h-full rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: cpuColor.primary }}>
            ▶
          </div>
        </div>
      )}
    </div>
  );
}
