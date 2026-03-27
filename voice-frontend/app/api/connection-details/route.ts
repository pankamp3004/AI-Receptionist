import { NextResponse } from 'next/server';
import { AccessToken, AgentDispatchClient, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// Environment variables - define these in .env.local
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_AGENT_NAME = process.env.LIVEKIT_AGENT_NAME || process.env.NEXT_PUBLIC_AGENT_NAME;

// Don't cache the results
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get('org_id');
    const phone = url.searchParams.get('phone');

    if (!LIVEKIT_URL) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (!API_KEY) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (!API_SECRET) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Parse agent configuration from request body.
    // Prefer an explicit env fallback so production works even if the client
    // does not send an agent name in room_config.
    const body = await req.json().catch(() => ({}));
    const requestedAgentName: string | undefined = body?.room_config?.agents?.[0]?.agent_name;
    const agentName = requestedAgentName || LIVEKIT_AGENT_NAME;

    // Generate participant token
    const participantName = phone ? `Caller ${phone.slice(-4)}` : 'user';
    const participantIdentity = phone 
      ? `${phone}_user_${Math.floor(Math.random() * 10_000)}`
      : `voice_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = orgId 
      ? `org_${orgId}_${Math.floor(Math.random() * 10_000)}`
      : `voice_room_${Math.floor(Math.random() * 10_000)}`;

    const metadata = JSON.stringify({
      organization_id: orgId ?? null,
      phone_number: phone ?? null,
    });

    if (agentName) {
      const dispatchClient = new AgentDispatchClient(
        toHttpUrl(LIVEKIT_URL),
        API_KEY,
        API_SECRET,
      );
      await dispatchClient.createDispatch(roomName, agentName, { metadata });
    } else {
      console.warn(
        'No agent name configured. Set LIVEKIT_AGENT_NAME or NEXT_PUBLIC_AGENT_NAME to enable explicit dispatch.',
      );
    }

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName, metadata },
      roomName,
      agentName
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName,
    };

    const headers = new Headers({
      'Cache-Control': 'no-store',
    });

    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Connection details error:', error);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName?: string
): Promise<string> {
  const at = new AccessToken(API_KEY!, API_SECRET!, {
    ...userInfo,
    ttl: '15m',
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };

  at.addGrant(grant);

  // Note: RoomConfiguration for agent dispatch requires livekit-server-sdk v2.x
  // The agent will be dispatched automatically if configured in LiveKit Cloud

  return at.toJwt();
}

function toHttpUrl(url: string): string {
  if (url.startsWith('wss://')) {
    return `https://${url.slice('wss://'.length)}`;
  }
  if (url.startsWith('ws://')) {
    return `http://${url.slice('ws://'.length)}`;
  }
  return url;
}
