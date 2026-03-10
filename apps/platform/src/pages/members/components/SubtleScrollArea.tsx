import { type ReactNode, useEffect, useRef, useState } from 'react';

interface SubtleScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export const SubtleScrollArea = ({
  children,
  className,
}: SubtleScrollAreaProps) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<number | null>(null);

  const resetScrollTimer = () => {
    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = window.setTimeout(() => {
      setIsScrolling(false);
      scrollTimerRef.current = null;
    }, 720);
  };

  const handleScroll = () => {
    if (!isScrolling) {
      setIsScrolling(true);
    }

    resetScrollTimer();
  };

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      data-scrolling={isScrolling ? 'true' : 'false'}
      onScroll={handleScroll}
      className={['members-scroll-area', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
};
