import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** フェード時間(ms) */
  duration?: number;
};

export default function EmotionImage({ src, alt = '', className = '', duration = 150 }: Props) {
  const [current, setCurrent] = useState(src);     // 画面に出している src
  const [nextSrc, setNextSrc] = useState<string>(); // ロード中の新 src
  const [showNext, setShowNext] = useState(false);  // フェード表示切替
  const mounted = useRef(true);

  // src が変わったら先読み
  useEffect(() => {
    if (!src || src === current) return;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (!mounted.current) return;
      setNextSrc(src);
      setShowNext(true);
      // フェード完了後に current を置き換え
      setTimeout(() => {
        if (!mounted.current) return;
        setCurrent(src);
        setShowNext(false);
        setNextSrc(undefined);
      }, duration);
    };
  }, [src, current, duration]);

  useEffect(() => () => { mounted.current = false; }, []);

  const common = 'absolute inset-0 w-full h-full object-contain'; // 好みで cover/contain

  return (
    <div className={`relative ${className}`} style={{ transition: `opacity ${duration}ms` }}>
      {/* 下層：常に現在の画像を表示（白挟み防止） */}
      <img key={`cur-${current}`} src={current} alt={alt} className={common} draggable={false} />
      {/* 上層：新画像。読み終わったらフェードイン→切替 */}
      {nextSrc && (
        <img
          key={`next-${nextSrc}`}
          src={nextSrc}
          alt={alt}
          className={common}
          style={{ opacity: showNext ? 1 : 0, transition: `opacity ${duration}ms` }}
          draggable={false}
        />
      )}
    </div>
  );
}
