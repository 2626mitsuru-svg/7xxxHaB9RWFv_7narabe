import React, { useEffect, useRef, useState } from 'react';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** フェード時間(ms) */
  duration?: number;
};

/**
 * 仕様：
 * - 新しい src を受け取ったらまず先読み（onload）。
 * - 読み終わったら上レイヤーにフェードイン → 完了後に current を置換。
 * - 旧画像は常に残す＝白フレームなし。
 * - 読み込み失敗時は ERROR_IMG_SRC をフェイルオーバー。
 */
export function ImageWithFallback(props: Props) {
  const { src = '', alt = '', className = '', style, duration = 150, ...rest } = props;

  const [current, setCurrent] = useState(src);        // 画面に表示中の src
  const [nextSrc, setNextSrc] = useState<string>();   // 先読み済みの新しい src
  const [fadeIn, setFadeIn] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const mounted = useRef(true);

  // src 変更時：先読みしてからフェード置換
  useEffect(() => {
    if (!src || src === current) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !mounted.current) return;
      setFallback(null);       // 以前のエラー状態があれば解除
      setNextSrc(src);
      setFadeIn(true);
      // フェード完了後に current を置換
      setTimeout(() => {
        if (!mounted.current) return;
        setCurrent(src);
        setFadeIn(false);
        setNextSrc(undefined);
      }, duration);
    };
    img.onerror = () => {
      if (cancelled || !mounted.current) return;
      // 新画像が壊れている場合はフェイルオーバー（画面は旧画像のまま）
      setFallback(ERROR_IMG_SRC);
      setFadeIn(false);
      setNextSrc(undefined);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, current, duration]);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const common = 'absolute inset-0 w-full h-full object-contain'; // 必要に応じて contain/cover を調整

  return (
    <div className={`relative ${className}`} style={style}>
      {/* 下層：常に current を表示（白を挟まない本丸） */}
      <img
        src={fallback ? fallback : current}
        alt={alt}
        className={common}
        draggable={false}
        {...rest}
      />

      {/* 上層：next をフェードインして置換 */}
      {nextSrc && (
        <img
          src={nextSrc}
          alt={alt}
          className={common}
          style={{ opacity: fadeIn ? 1 : 0, transition: `opacity ${duration}ms` }}
          draggable={false}
          // 上層の onError はほぼ発火しない（先読みで担保）。保険として fallback に寄せる
          onError={() => setFallback(ERROR_IMG_SRC)}
        />
      )}
    </div>
  );
}

export default ImageWithFallback;
