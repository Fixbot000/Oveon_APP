import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    setIsPulling(false);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || startY.current === 0 || window.scrollY > 0) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      e.preventDefault();
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
      setIsPulling(distance > 20);
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || pullDistance < PULL_THRESHOLD) {
      setPullDistance(0);
      setIsPulling(false);
      startY.current = 0;
      return;
    }

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
      startY.current = 0;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, pullDistance]);

  const shouldShowIcon = isPulling || isRefreshing;
  const iconRotation = isRefreshing ? 'animate-spin' : pullDistance > PULL_THRESHOLD ? 'rotate-180' : '';

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out z-10"
        style={{ 
          transform: `translateY(${shouldShowIcon ? pullDistance - 40 : -40}px)`,
          opacity: shouldShowIcon ? 1 : 0
        }}
      >
        <div className="bg-background border border-border rounded-full p-2 shadow-lg">
          <RefreshCw 
            className={`h-5 w-5 text-primary transition-transform duration-200 ${iconRotation}`} 
          />
        </div>
      </div>

      {/* Content */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};