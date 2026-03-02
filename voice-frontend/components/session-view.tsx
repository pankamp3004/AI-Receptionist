'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSessionContext, useSessionMessages, useAgent, useChat } from '@livekit/components-react';
import { AudioVisualizer } from '@/components/audio-visualizer';
import { ChatTranscript } from '@/components/chat-transcript';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, MessageSquare, Send, Loader2, X } from 'lucide-react';
import type { AppConfig } from '@/app-config';
import { cn } from '@/lib/utils';

interface ErrorState {
  hasError: boolean;
  message: string;
  details?: string[];
}

interface SessionViewProps {
  config: AppConfig;
  onError?: (error: ErrorState) => void;
}

export function SessionView({ config, onError }: SessionViewProps) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const agent = useAgent();
  const { send, isSending } = useChat();
  const [chatOpen, setChatOpen] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle agent errors
  useEffect(() => {
    if (session.isConnected && agent.state === 'failed') {
      const reasons = agent.failureReasons || [];
      onError?.({
        hasError: true,
        message: 'Session ended unexpectedly',
        details: reasons.length > 0 ? reasons : ['Unknown error occurred'],
      });
      session.end();
    }
  }, [agent.state, agent.failureReasons, session.isConnected, session.end, onError]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatOpen]);

  // Auto-scroll on new messages
  useLayoutEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is updated after animations
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending) return;
    
    try {
      await send(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [message, isSending, send]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col min-h-screen bg-background"
    >
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Chat Transcript Overlay */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-background flex flex-col"
            >
              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8">
                <div className="max-w-2xl mx-auto space-y-3">
                  {messages.map((msg, idx) => {
                    const isUser = msg.from?.isLocal;
                    return (
                      <motion.div
                        key={msg.id || `msg-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'flex items-start gap-2 max-w-[85%]',
                          isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                        )}
                      >
                        <div
                          className={cn(
                            'px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
                            isUser
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-secondary rounded-tl-sm'
                          )}
                        >
                          {msg.message}
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* Thinking indicator */}
                  {agent.state === 'thinking' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 max-w-[85%] mr-auto"
                    >
                      <div className="bg-secondary px-4 py-2 rounded-2xl rounded-tl-sm">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="w-2 h-2 bg-muted-foreground rounded-full"
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Chat Input - Always visible when chat is open */}
              <div className="sticky bottom-0 p-4 bg-background border-t">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-background border rounded-2xl p-2 flex items-end gap-2 shadow-lg">
                    <textarea
                      ref={inputRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      disabled={isSending}
                      className="flex-1 bg-transparent border-none outline-none resize-none px-3 py-2 text-sm max-h-32 disabled:opacity-50"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setChatOpen(false)}
                      className="rounded-xl flex-shrink-0 text-muted-foreground hover:text-foreground"
                      title="Close message mode"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={session.end}
                      className="rounded-xl flex-shrink-0"
                      title="End call"
                    >
                      <PhoneOff className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!message.trim() || isSending}
                      className="rounded-xl flex-shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio Visualizer */}
        <div className="flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <AudioVisualizer className="w-64 md:w-80" />
          </motion.div>

          {/* Status Text */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-sm"
          >
            {messages.length === 0
              ? 'Agent is listening, ask it a question'
              : 'Conversation in progress...'}
          </motion.p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
          {/* Microphone Toggle */}
          <Button
            variant={micEnabled ? 'default' : 'secondary'}
            size="icon"
            onClick={() => setMicEnabled(!micEnabled)}
            className={cn(
              'rounded-full w-12 h-12 transition-all',
              !micEnabled && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
            title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          {/* Chat Toggle */}
          {config.supportsChatInput && (
            <Button
              variant={chatOpen ? 'default' : 'secondary'}
              size="icon"
              onClick={() => setChatOpen(!chatOpen)}
              className="rounded-full w-12 h-12"
              title={chatOpen ? 'Close message mode' : 'Open message mode'}
            >
              {chatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </Button>
          )}

          {/* End Call */}
          <Button
            variant="destructive"
            size="icon"
            onClick={session.end}
            className="rounded-full w-12 h-12"
            title="End call"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}