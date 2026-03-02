'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChat, useSessionContext, useVoiceAssistant } from '@livekit/components-react';
import { Mic, MicOff, PhoneOff, MessageSquare, Send, Loader2, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ControlBarProps {
  onChatToggle: () => void;
  isChatOpen: boolean;
  supportsChat: boolean;
}

export function ControlBar({ onChatToggle, isChatOpen, supportsChat }: ControlBarProps) {
  const { end, isConnected } = useSessionContext();
  const { send, isSending } = useChat();
  const { state: agentState } = useVoiceAssistant();
  const [micEnabled, setMicEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatOpen]);

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

  const isAgentSpeaking = agentState === 'speaking';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 p-4"
    >
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Chat Input */}
        <AnimatePresence>
          {supportsChat && isChatOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-3">
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

          {/* Agent speaking indicator */}
          {isAgentSpeaking && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs text-primary font-medium">Speaking</span>
            </motion.div>
          )}

          {/* Chat Toggle */}
          {supportsChat && (
            <Button
              variant={isChatOpen ? 'default' : 'secondary'}
              size="icon"
              onClick={onChatToggle}
              className="rounded-full w-12 h-12"
              title={isChatOpen ? 'Close chat' : 'Open chat'}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          )}

          {/* End Call */}
          <Button
            variant="destructive"
            size="icon"
            onClick={end}
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