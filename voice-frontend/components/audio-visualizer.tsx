'use client';

import { useEffect, useRef, memo } from 'react';
import { motion } from 'motion/react';
import { useVoiceAssistant } from '@livekit/components-react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  className?: string;
  barCount?: number;
}

// Memoized for performance
export const AudioVisualizer = memo(function AudioVisualizer({ 
  className,
  barCount = 32 
}: AudioVisualizerProps) {
  const { state } = useVoiceAssistant();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true }); // Enable transparency
    if (!ctx) return;

    const isSpeaking = state === 'speaking';
    
    // Pre-calculate constants
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = (width / barCount) * 2.5;
    const halfHeight = height / 2;

    const draw = () => {
      // Clear canvas - transparent when speaking, dark background when idle
      if (isSpeaking) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);
      }

      const phase = phaseRef.current;

      for (let i = 0; i < barCount; i++) {
        let barHeight: number;
        
        if (isSpeaking) {
          // More dynamic animation when speaking
          const noise = Math.sin(phase * 3 + i * 0.5) * 0.5 + 0.5;
          const random = Math.random() * 0.3;
          barHeight = (noise * 0.7 + random * 0.3) * 60 + 20;
        } else {
          // Gentle wave when idle
          barHeight = Math.sin(phase + i * 0.15) * 8 + 12;
        }
        
        const x = i * barWidth;
        const y = halfHeight - barHeight / 2;

        // Create gradient once per bar
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#1d4ed8');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 2, barHeight);
      }

      phaseRef.current += isSpeaking ? 0.15 : 0.03;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, barCount]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('relative rounded-lg overflow-hidden', className)}
      style={{ backgroundColor: state === 'speaking' ? 'transparent' : undefined }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={150}
        className="w-full h-auto"
        style={{ imageRendering: 'crisp-edges' }}
      />
      {/* Speaking indicator overlay - hidden when speaking for transparent effect */}
      {state !== 'speaking' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 bg-primary/20 rounded-full"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-xs text-primary font-medium">Speaking</span>
        </motion.div>
      )}
    </motion.div>
  );
});