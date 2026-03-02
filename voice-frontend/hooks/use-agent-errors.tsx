'use client';

import { useEffect, useCallback } from 'react';
import { useAgent, useSessionContext } from '@livekit/components-react';

interface ErrorState {
  hasError: boolean;
  message: string;
  details?: string[];
}

export function useAgentErrors(
  onError?: (error: ErrorState) => void,
  onRecover?: () => void
) {
  const agent = useAgent();
  const { isConnected, end } = useSessionContext();

  const handleError = useCallback(() => {
    if (isConnected && agent.state === 'failed') {
      const reasons = agent.failureReasons || [];
      
      const errorState: ErrorState = {
        hasError: true,
        message: 'Session ended unexpectedly',
        details: reasons.length > 0 ? reasons : ['Unknown error occurred'],
      };

      onError?.(errorState);
      
      // Auto-end session on failure
      end();
    }
  }, [agent, isConnected, end, onError]);

  useEffect(() => {
    handleError();
  }, [handleError, agent.state]);

  return {
    agentState: agent.state,
    failureReasons: agent.failureReasons,
    isFailed: agent.state === 'failed',
    isConnected,
  };
}