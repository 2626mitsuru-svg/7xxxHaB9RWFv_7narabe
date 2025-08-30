// src/components/EmotionImage.tsx
'use client';
import { useEffect, useRef, useState, useMemo } from 'react';

type Props = {
  src: string;               // 目標の画像URL
  alt?: string;
  className?: string;
  duration?: number;         // フェード時間(ms)
};

export default function EmotionImage({
  src,
  alt = '',
  className = '',
  duration = 180,
}: Props) {
  // 連続更新の競合排除用 epoch
  const epochRef = useRef(0);

  // 表示中(front)と次のフレーム(back)
  const [frontSrc, setFrontSrc] = useState(src);
  const [backSrc, setBackSrc]   = useState<string>(src);
  const [showBack, setShowBack] = useState(false);

  // back <img> への参照（transitionend を受ける）
  const backImgRef = useRef<HTMLImageElement | null>(null);

  // 余計なキャッシュバスターを無効化（?t=123 などがあると毎回“別画像”扱いで無限フェード）
  const normalizedSrc = useMemo(() => {
    try {
      const u = new URL(src, location.origin);
      // よくあるバスターを除去（使っていないならそのままでも可）
      ['t', 'ts', '_ts', 'cb', 'cacheBust'].forEach((k) => u.searchParams.delete(k));
      return u.toString();
    } catch {
      return src;
    }
  }, [src]);

  useEffect(() => {
    if (!normalizedSrc || normalizedSrc === frontSrc) return;

    const myEpoch = ++epochRef.current;
    const ctrl = new AbortController();

    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    // 必要なら img.crossOrigin = 'anonymous';
    img.src = normalizedSrc;

    const setFadeIn = () => {
      if (epochRef.current !== myEpoch || ctrl.signal.aborted) return;
      // 裏に読み終わったフレームをセット
      setBackSrc(normalizedSrc);
      // 次フレームでフェード開始（同一フレーム内で opacity を変えるとスキップされるブラウザがある）
      requestAnimationFrame(() => {
        if (epochRef.current !== myEpoch || ctrl.signal.aborted) return;
        setShowBack(true);
      });
    };

    if (img.complete) {
      // キャッシュ済でも decode 待ちを試みてから
      (img as any).decode?.().finally(setFadeIn);
    } else {
      img.onload = () => (img as any).decode?.().finally(setFadeIn);
      img.onerror = () => {
        // 失敗時は front を維持（白を出さない）
      };
    }

    return () => {
      ctrl.abort();
    };
  }, [normalizedSrc, frontSrc]);

  // フェード終了を「実際の transitionend」で確定
  useEffect(() => {
    const el = backImgRef.current;
    if (!el) return;

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'opacity') return;
      // showBack が true → フェードイン完了
      if (showBack) {
        setFrontSrc(backSrc);
        setShowBack(false); // 裏は透明に戻す（ただし常時マウントは維持）
      }
    };
    el.addEventListener('transitionend', onEnd);
    return () => el.removeEventListener('transitionend', onEnd);
  }, [showBack, backSrc]);

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    contain: 'layout paint size',
    backfaceVisibility: 'hidden',
    transform: 'translateZ(0)',
  };
  const common = 'absolute inset-0 w-full h-full object-contain will-change-opacity';

  return (
    <div className={`relative ${className}`} style={wrapperStyle}>
      {/* 下：常時表示（白挟み防止） */}
      <img
        src={frontSrc}
        alt={alt}
        className={common}
        style={{ opacity: showBack ? 0 : 1, transition: `opacity ${duration}ms linear` }}
        decoding="async"
        loading="eager"
        draggable={false}
      />
      {/* 上：常時マウント。不要時は透明 */}
      <img
        ref={backImgRef}
        src={backSrc}
        alt={alt}
        className={common}
        style={{ opacity: showBack ? 1 : 0, transition: `opacity ${duration}ms linear` }}
        decoding="async"
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
