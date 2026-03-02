'use client';

import { motion } from 'motion/react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppConfig } from '@/app-config';

interface WelcomeViewProps {
  config: AppConfig;
  onStartCall: () => void;
}

export function WelcomeView({ config, onStartCall }: WelcomeViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-screen px-4"
    >
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="p-4 rounded-full bg-primary/10"
        >
          <Mic className="w-12 h-12 text-primary" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            Voice AI Assistant
          </h1>
          <p className="text-muted-foreground max-w-md">
            Start a conversation with your AI voice assistant. Click the button below to begin.
          </p>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            size="lg"
            onClick={onStartCall}
            className="rounded-full px-8 py-6 text-base font-semibold"
          >
            {config.startButtonText}
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-6 text-xs text-muted-foreground"
      >
      
      </motion.p>
    </motion.div>
  );
}