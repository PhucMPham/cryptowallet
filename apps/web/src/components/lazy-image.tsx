"use client";

import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";

interface LazyImageProps {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function LazyImage({ src, alt, fallback, className, onError }: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const [imageError, setImageError] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView && src) {
      setImageSrc(src);
    }
  }, [inView, src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    onError?.(e);
  };

  if (imageError || !src) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={className}>
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
          {alt.slice(0, 2).toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          className="w-6 h-6 rounded-full"
          onError={handleError}
          loading="lazy"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
      )}
    </div>
  );
}