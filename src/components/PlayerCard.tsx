import React, { useState, useEffect, useRef } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback'; // 追加：先読み＋クロスフェード画像

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
  onImageError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  rankings: string[]; // 順位配列を追加
  allPlayers?: Player[]; // 全プレイヤー情報（他人の手札枚数判定用）
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
  
  // ★安全に手札枚数を取得
  const handCount = player.handCount ?? player.hand?.length ?? 0;
  
  // 絵文字リアクションエリア用状態管理
  const [isReactionVisible, setIsReactionVisible] = useState(false);
  const [isReactionAnimating, setIsReactionAnimating] = useState(false);
  const [isReactionFadingOut, setIsReactionFadingOut] = useState(false);
  const [previousEmoji, setPreviousEmoji] = useState<string>('');
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // デバウンス用の状態管理
  const lastReactionTimeRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ターン切り替え制御用の静的参照（全PlayerCard共通）
  if (!window.turnChangeController) {
    window.turnChangeController = {
      lastTurnChange: 0,
      activePlayerId: null
    };
  }
  
  // 現在の絵文字を計算（新しい条件に対応）
  const getCurrentEmoji = () => {
    // 最優先: 脱落状態
    if (player.isEliminated) return '⚰️';
    
    // 次優先: 上がり状態（1位なら王冠のみ、その他は表示なし）
    if (player.isFinished) {
      return rankings.indexOf(player.id) === 0 ? '👑' : '😊';
    }
    
    // 自分の手札が2枚または1枚の時
    if (handCount <= 2 && handCount > 0) {
      return '♫';
    }
    
    // 他人の手札が1枚の時
    const othersWithOneCard = allPlayers.filter(p => 
      p.id !== player.id && 
      !p.isFinished && 
      !p.isEliminated && 
      (p.handCount ?? p.hand?.length ?? 0) === 1
    );
    if (othersWithOneCard.length > 0) {
      return '❗️';
    }
    
    // パスした時（最後の行動がパスの場合、ただし自分のターン中は除く）
    if (lastAction === 'pass' && !isCurrentPlayer) {
      return '💦';
    }
    
    // デフォルト: 笑顔
    return '😊';
  };
  
  const currentEmoji = getCurrentEmoji();
  
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
      rankIndex: rankings.indexOf(player.id)
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
      
      // ターン切り替え时の重複制御
      if (isTurnChange) {
        const now = Date.now();
        const global = window.turnChangeController;
        
        // 新しいターン開���の場合は優先権を与える
        if (currentState.isCurrentPlayer) {
          global.lastTurnChange = now;
          global.activePlayerId = player.id;
          console.log(`[ターン制御] ${player.name}: ターン開始を記録 (優先)`);
        } else {
          // ターン終了の場合は、同時期に新しいターンが開始されていれば抑制
          if (now - global.lastTurnChange < 100 && global.activePlayerId && global.activePlayerId !== player.id) {
            console.log(`[ターン制御] ${player.name}: ターン終了リアクションを抑制 (${global.activePlayerId}のターン開始を優先)`);
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
  
  // 絵文字変更時のリアクションエリア表示＋アニメーション発火（ターン制御＋デバウンス付き）
  useEffect(() => {
    if (previousEmoji !== '' && previousEmoji !== currentEmoji) {
      const now = Date.now();
      const timeSinceLastReaction = now - lastReactionTimeRef.current;
      
      // ターン切り替えの重複制御チェック
      const isCurrentTurn = currentEmoji === '⚡';
      const wasPreviousTurn = previousEmoji === '⚡';
      const isTurnRelatedChange = isCurrentTurn || wasPreviousTurn;
      
      if (isTurnRelatedChange) {
        const global = window.turnChangeController;
        
        // ターン終了リアクション（⚡ → 😊）を抑制する条件
        if (wasPreviousTurn && !isCurrentTurn) {
          // 他のプレイヤーがターン開始してから100ms以内の場合は抑制
          if (global.activePlayerId && global.activePlayerId !== player.id && now - global.lastTurnChange < 100) {
            console.log(`[絵文字リアクション] ${player.name}: ターン終了リアクションを抑制 (${global.activePlayerId}のターン開始優先)`);
            setPreviousEmoji(currentEmoji);
            return;
          }
        }
      }
      
      // デバウンス: 300ms以内の連続変更は無視
      if (timeSinceLastReaction < 300) {
        console.log(`[絵文字リアクション] ${player.name}: デバウンス中 - ${previousEmoji} → ${currentEmoji} (${timeSinceLastReaction}ms前に実行済み)`);
        // 前の絵文字を更新だけして終了
        setPreviousEmoji(currentEmoji);
        return;
      }
      
      // 前回のデバウンスタイマーをクリア
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      // デバウンス付きでリアクションを実行
      debounceTimeoutRef.current = setTimeout(() => {
        console.log(`[絵文字リアクション] ${player.name}: ${previousEmoji} → ${currentEmoji}`);
        
        // 既存のタイマーをクリア
        if (reactionTimeoutRef.current) {
          clearTimeout(reactionTimeoutRef.current);
        }
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current);
        }
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        
        // リアクションエリアを表示してアニメーション開始
        setIsReactionVisible(true);
        setIsReactionAnimating(true);
        setIsReactionFadingOut(false);
        
        // ポップアップアニメーション终了のタイマー（300ms）
        reactionTimeoutRef.current = setTimeout(() => {
          setIsReactionAnimating(false);
        }, 300);
        
        // フェードアウト開始のタイマー（2.3秒後）
        fadeTimeoutRef.current = setTimeout(() => {
          setIsReactionFadingOut(true);
        }, 2300);
        
        // リアクションエリア非表示のタイマー（2.5秒後）
        hideTimeoutRef.current = setTimeout(() => {
          setIsReactionVisible(false);
          setIsReactionFadingOut(false);
        }, 2500);
        
        // 最後の実行時間を記録
        lastReactionTimeRef.current = Date.now();
        debounceTimeoutRef.current = null;
      }, 50); // 50msのデバウンス
    }
    
    // 現在の絵文字を前の絵文字として保存（初回は無条件で保存）
    if (previousEmoji !== currentEmoji) {
      setPreviousEmoji(currentEmoji);
    }
  }, [currentEmoji, previousEmoji, player.name]);
  
  // クリーンアップ
  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current);
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  // 順位によるスタイルクラスを決定
  const getRankStyleClass = () => {
    // ドボンまたは反則上がりの場合は灰色
    if (player.isEliminated) {
      return 'player-card-eliminated';
    }
    
    // 上がったプレイヤーの順位を確認
    if (player.isFinished && rankings.length > 0) {
      const playerRankIndex = rankings.indexOf(player.id);
      if (playerRankIndex !== -1) {
        const rank = playerRankIndex + 1; // 1始まりの順位
        switch (rank) {
          case 1: return 'player-card-rank-1st';
          case 2: return 'player-card-rank-2nd';
          case 3: return 'player-card-rank-3rd';
          case 4: return 'player-card-rank-4th';
          default: return '';
        }
      }
    }
    
    return '';
  };
  
  const rankStyleClass = getRankStyleClass();
  
  // ポジション別のスタイル設定（表情円のはみ出しを考慮して調整）
  const positionStyles = {
    'top-left': 'fixed top-12 left-12', // 表情円の上46px+余裕を考慮
    'top-right': 'fixed top-12 right-12', // 表情円の上46px+余裕を考慮
    'bottom-left': 'fixed bottom-12 left-12', // 表情円の下46px+余裕を考慮
    'bottom-right': 'fixed bottom-12 right-12', // 表情円の下46px+余裕を考慮
  };

  // ①表情エリア（レイアウト保持用の透明スペース）
  const ExpressionArea = () => (
    <div className="w-40 h-40 opacity-0 pointer-events-none">
      {/* レイアウト保持用の透明な円 */}
    </div>
  );

  // 浮遊する表情円＋リアクション欄（セット）- 背景を白に
  const FloatingExpressionArea = () => (
    <div className="relative">
      <div 
        className="w-40 h-40 rounded-full border-4 overflow-hidden bg-white expression-border"
        style={{ borderColor: cpuColor.primary }}
      >
<ImageWithFallback
  src={getExpressionUrl(player.id)}
  alt={`${player.name}の表情`}
  className="w-full h-full object-cover"
  data-player-id={player.id}
  duration={150}       // フェード時間（必要なら調整）
/>
      </div>
      {/* リアクションエリア（表情エリアの右上） - 条件付き表示 */}
      {isReactionVisible && (
        <div 
          className={`absolute -top-1 -right-1 w-12 h-12 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center text-xl shadow-lg ${
            isReactionAnimating ? 'reaction-popup-animation' : 
            isReactionFadingOut ? 'reaction-fadeout-animation' : ''
          }`}
        >
          <span className="inline-block">
            {currentEmoji}
          </span>
        </div>
      )}
    </div>
  );

  // ②CPU情報エリア（レイアウト保持用の透明スペース）
  const InfoArea = () => (
    <div className="w-32 h-20 opacity-0 pointer-events-none">
      {/* レイアウト保持用の透明スペース */}
    </div>
  );

  // 浮遊する情報エリア（改行なし、コンパクト）
  const FloatingInfoArea = () => (
    <div 
      className="bg-white/95 dark:bg-gray-800/95 rounded-xl p-3 border-2 backdrop-blur-sm info-border"
      style={{ borderColor: cpuColor.primary }}
    >
      <div className="space-y-1">
        <div 
          className="font-bold text-lg"
          style={{ color: cpuColor.primary }}
        >
          {player.name}
          {/* 順位表示 */}
          {player.isFinished && rankings.length > 0 && (() => {
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
        {/* 改行なしでコンパクトに */}
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

  // ③手札エリア（残り枚数を反映したバー）- 背景・枠を透明に
  const HandArea = () => {
    const maxCards = 13; // 七並べの最大手札数
    const cardWidth = 8; // 各カードの幅（px）
    
    return (
      <div className="p-2">
        <div className="flex items-center justify-center space-x-0.5">
          {Array.from({ length: maxCards }, (_, i) => (
            <div
              key={i}
              className={`h-6 rounded-sm ${
                i < handCount 
                  ? 'bg-gray-700 dark:bg-gray-300' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
              style={{ width: `${cardWidth}px` }}
            />
          ))}
        </div>
      </div>
    );
  };

  // ④吹き出しエリア（表情エリアに向かってしっぽを配置）
  const SpeechArea = () => {
    if (!speech) return null;

    // 各位置での吹き出しのしっぽの方向を表情エリアに向ける
    const getBubbleTailClasses = () => {
      switch (position) {
        case 'top-left':
          // 表情エリアは左上にあるので、吹き出しから左上に向かってしっぽを出す
          return 'before:absolute before:content-[""] before:w-0 before:h-0 before:border-8 before:border-transparent before:border-b-white dark:before:border-b-gray-800 before:-top-4 before:left-6 before:z-10';
        case 'top-right':
          // 表情エリアは右上にあるので、吹き出しから右上に向かってしっぽを出す
          return 'before:absolute before:content-[""] before:w-0 before:h-0 before:border-8 before:border-transparent before:border-b-white dark:before:border-b-gray-800 before:-top-4 before:right-6 before:z-10';
        case 'bottom-left':
          // 表情エリアは左下にあるので、吹き出しから左下に向かってしっぽを出す
          return 'before:absolute before:content-[""] before:w-0 before:h-0 before:border-8 before:border-transparent before:border-t-white dark:before:border-t-gray-800 before:-bottom-4 before:left-6 before:z-10';
        case 'bottom-right':
          // 表情エリアは右下にあるので、吹き出しから右下に向かってしっぽを出す
          return 'before:absolute before:content-[""] before:w-0 before:h-0 before:border-8 before:border-transparent before:border-t-white dark:before:border-t-gray-800 before:-bottom-4 before:right-6 before:z-10';
        default:
          return '';
      }
    };

    return (
      <div 
        className={`bg-white dark:bg-gray-800 border-2 rounded-xl p-3 shadow-lg max-w-xs speech-tail speech-bubble relative ${getBubbleTailClasses()}`}
        style={{ borderColor: cpuColor.primary }}
      >
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-tight">
          {speech}
        </p>
      </div>
    );
  };

  // 位置別レイアウト組み立て（修正版）
  const getLayoutByPosition = () => {
    switch (position) {
      case 'top-left':
        // 左上：表情の右隣に情報→吹き出し（16px間隔）→手札
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
        // 右上：表情の左隣に情報→吹き出し（16px間隔）→手札
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
        // 左下：手札→吹き出し（16px間隔）→表情の右隣に情報
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
        // 右下：手札→吹き出し（16px間隔）→表情の左隣に情報
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

  // ��体の枠スタイル（もっと白に近いグラデーション - rgb値を使用）
  const containerStyle = {
    background: `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(${cpuColor.rgb}, 0.15) 100%)`,
    border: `4px solid ${cpuColor.primary}`,
    borderRadius: '20px',
    padding: '20px',
    backdropFilter: 'blur(8px)',
    opacity: isCurrentPlayer || isActive ? 1 : 0.75, // ターン時以外は薄く
    maxWidth: '380px',
    boxShadow: borderShadow,
  };

  // 浮遊する表情円の位置スタイル
  const getFloatingExpressionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 50, // playercard枠より上
      pointerEvents: 'none' as const,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: '-46px', left: '-10px' }; // 上に46px、左に10px
      case 'top-right':
        return { ...baseStyle, top: '-46px', right: '-10px' }; // 上に46px、右に10px
      case 'bottom-left':
        return { ...baseStyle, bottom: '-46px', left: '-10px' }; // 下に46px、左に10px
      case 'bottom-right':
        return { ...baseStyle, bottom: '-46px', right: '-10px' }; // 下に46px、右に10px
      default:
        return baseStyle;
    }
  };

  // 浮遊する情報エリアの位置スタイル
  const getFloatingInfoStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 55, // 表情円と同レベル
      pointerEvents: 'none' as const,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: '20px', left: '170px' }; // 50px下に移動（-30→+20）
      case 'top-right':
        return { ...baseStyle, top: '20px', right: '170px' }; // 50px下に移動（-30→+20）
      case 'bottom-left':
        return { ...baseStyle, bottom: '20px', left: '170px' }; // 20pxに変更
      case 'bottom-right':
        return { ...baseStyle, bottom: '20px', right: '170px' }; // 20pxに変更
      default:
        return baseStyle;
    }
  };

  // ターンマークの位置スタイル（プレイヤーエリア枠の外側）
  const getTurnMarkerStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 60, // 表情円より上
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, bottom: '-20px', right: '-20px' }; // 右下角、外側に20px
      case 'top-right':
        return { ...baseStyle, bottom: '-20px', left: '-20px' }; // 左下角、外側に20px
      case 'bottom-left':
        return { ...baseStyle, top: '-20px', right: '-20px' }; // 右上角、外側に20px
      case 'bottom-right':
        return { ...baseStyle, top: '-20px', left: '-20px' }; // 左上角、外側に20px
      default:
        return baseStyle;
    }
  };

  return (
    <div 
      className={`${positionStyles[position]} z-10 ${rankStyleClass} ${isCurrentPlayer ? 'player-card-thinking' : isActive ? 'player-card-active' : ''} `}
      style={containerStyle}
    >
      {/* メインレイアウト */}
      {getLayoutByPosition()}
      
      {/* 浮遊する表情円＋リアクション欄（枠からはみ出し） */}
      <div style={getFloatingExpressionStyle()}>
        <FloatingExpressionArea />
      </div>
      
      {/* 浮遊する情報エリア（枠の上にはみ出し） */}
      <div style={getFloatingInfoStyle()}>
        <FloatingInfoArea />
      </div>
      
      {/* ターンマーク「▶」（Playercard枠の内側端） */}
      {isCurrentPlayer && (
        <div 
          style={getTurnMarkerStyle()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg"
        >
          <div 
            className="w-full h-full rounded-full flex items-center justify-center text-sm"
            style={{ backgroundColor: cpuColor.primary }}
          >
            ▶
          </div>
        </div>
      )}
    </div>
  );
}