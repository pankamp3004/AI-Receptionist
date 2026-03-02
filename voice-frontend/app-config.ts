export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;
  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  startButtonText: string;
  accentColor?: string;
  agentName?: string;
}

export const APP_CONFIG: AppConfig = {
  companyName: 'Voice AI',
  pageTitle: 'Voice AI Agent',
  pageDescription: 'A voice agent powered by LiveKit',
  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  startButtonText: 'Start Call',
  accentColor: '#3b82f6',
  agentName: process.env.NEXT_PUBLIC_AGENT_NAME,
};