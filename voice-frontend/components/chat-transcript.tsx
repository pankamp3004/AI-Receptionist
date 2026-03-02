'use client';

import { useRef, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgent, type ReceivedMessage } from '@livekit/components-react';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatTranscriptProps {
  messages: ReceivedMessage[];
  className?: string;
}

// Memoized message component for better performance
const MessageBubble = memo(function MessageBubble({ 
  message, 
  index 
}: { 
  message: ReceivedMessage; 
  index: number;
}) {
  const isUser = message.from?.isLocal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.1) }}
      className={cn(
        'flex items-start gap-2 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message */}
      <div
        className={cn(
          'px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-secondary rounded-tl-sm'
        )}
      >
        {message.message}
      </div>
    </motion.div>
  );
});

// Thinking indicator component
const ThinkingIndicator = memo(function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 max-w-[85%] mr-auto"
    >
      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-secondary px-4 py-2 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 bg-muted-foreground rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

export function ChatTranscript({ messages, className }: ChatTranscriptProps) {
  const { state: agentState } = useAgent();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Memoize messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && memoizedMessages.length > prevMessagesLengthRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevMessagesLengthRef.current = memoizedMessages.length;
  }, [memoizedMessages.length]);

  const isThinking = agentState === 'thinking';

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex-1 overflow-y-auto px-4 py-8 space-y-3',
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {memoizedMessages.map((msg, idx) => (
          <MessageBubble key={msg.id || `msg-${idx}`} message={msg} index={idx} />
        ))}
      </AnimatePresence>

      {/* Agent thinking indicator */}
      {isThinking && <ThinkingIndicator />}
    </div>
  );
}