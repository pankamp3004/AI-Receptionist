'use client';

import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { TokenSource } from 'livekit-client';
import { useSession, SessionProvider, RoomAudioRenderer } from '@livekit/components-react';
import { AnimatePresence } from 'motion/react';
import type { AppConfig } from '@/app-config';
import { WelcomeView } from '@/components/welcome-view';
import { SessionView } from '@/components/session-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MainPageProps {
  config: AppConfig;
  orgId?: string;
  phone?: string;
}

interface ErrorState {
  hasError: boolean;
  message: string;
  details?: string[];
}

export function MainPage({ config, orgId, phone }: MainPageProps) {
  const searchParams = useSearchParams();
  // Prefer the browser URL so tenant context works even if the server shell was built without searchParams (e.g. CDN/static quirks).
  const effectiveOrgId = searchParams.get('org_id') || orgId || undefined;
  const effectivePhone = searchParams.get('phone') || phone || undefined;

  const tokenSource = useMemo(() => {
    const params = new URLSearchParams();
    if (effectiveOrgId) params.append('org_id', effectiveOrgId);
    if (effectivePhone) params.append('phone', effectivePhone);

    const queryString = params.toString();
    const endpoint = `/api/connection-details${queryString ? `?${queryString}` : ''}`;

    return TokenSource.endpoint(endpoint);
  }, [effectiveOrgId, effectivePhone]);

  const session = useSession(
    tokenSource,
    { agentName: config.agentName || "" }
  );

  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });

  const handleError = useCallback((errorState: ErrorState) => {
    setError(errorState);
  }, []);

  const clearError = useCallback(() => {
    setError({ hasError: false, message: '' });
  }, []);

  return (
    <SessionProvider session={session}>
      <main className="min-h-screen bg-background">
        {/* Error Alert */}
        <AnimatePresence>
          {error.hasError && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
              <Alert variant="warning" className="relative">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  {error.message}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={clearError}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  {error.details && error.details.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-sm">
                      {error.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs">
                    <a
                      href="https://docs.livekit.io/agents/start/voice-ai/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      See quickstart guide
                    </a>
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!session.isConnected ? (
            <WelcomeView
              key="welcome"
              config={config}
              onStartCall={session.start}
            />
          ) : (
            <SessionView 
              key="session" 
              config={config} 
              onError={handleError}
            />
          )}
        </AnimatePresence>
        <RoomAudioRenderer />
      </main>
    </SessionProvider>
  );
}