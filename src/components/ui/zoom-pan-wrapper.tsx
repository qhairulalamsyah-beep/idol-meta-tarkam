'use client';

import { ReactNode, useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface ZoomPanWrapperProps {
  children: ReactNode;
  className?: string;
  minZoom?: number;
  maxZoom?: number;
}

export function ZoomPanWrapper({
  children,
  className = '',
  minZoom = 0.5,
  maxZoom = 3,
}: ZoomPanWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const smoothScale = useSpring(scale, { stiffness: 300, damping: 30 });
  const smoothX = useSpring(x, { stiffness: 300, damping: 30 });
  const smoothY = useSpring(y, { stiffness: 300, damping: 30 });

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const currentScale = scale.get();
      const newScale = Math.min(maxZoom, Math.max(minZoom, currentScale * delta));
      scale.set(newScale);
    },
    [scale, minZoom, maxZoom]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan handlers
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-grab ${isDragging ? 'cursor-grabbing' : ''} ${className}`}
      style={{ touchAction: 'none' }}
    >
      <motion.div
        style={{
          x: smoothX,
          y: smoothY,
          scale: smoothScale,
          transformOrigin: 'center center',
        }}
        drag
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
