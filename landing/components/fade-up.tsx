'use client';

import { useEffect, useRef } from 'react';

interface FadeUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FadeUp({
  children,
  delay = 0,
  className = '',
  style,
}: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`fade-up ${className}`}
      style={{ transitionDelay: `${delay}s`, ...style }}
    >
      {children}
    </div>
  );
}
