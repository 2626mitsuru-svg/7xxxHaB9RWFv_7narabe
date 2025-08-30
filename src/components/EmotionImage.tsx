import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** フェード時間(ms) */
  duration?: number;
};

export default function EmotionImage({ src, alt = '', className = '', duration = 150 }: Props) {
  const [current, setCurrent] = useState(src);
  const [nextSrc, setNextSrc] = useState<string>();
  const [showNext, setShowNext] = useState(false);
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
      setTimeout(() => {
        if (!mounted.current) return;
        setCurrent(src);
        setShowNext(false);
        setNextSrc(undefined);
      }, duration);
    };
  }, [src, current, duration]);

  useEffect(() => () => { mounted.current = false; }, []);

  const common = 'absolute inset-0 w-full h-full object-contain';

  return (
    <div className={`relative ${className}`} /* ← ここでは transition を当てない */>
      {/* 下層：常に現在の画像を表示 */}
      <img src={current} alt={alt} className={common} draggable={false} />
      {/* 上層：新画像。読み終わったらフェードイン */}
      {nextSrc && (
        <img
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
