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

    // Parse agent configuration from request body
    const body = await req.json().catch(() => ({}));
    const agentName: string | undefined = body?.room_config?.agents?.[0]?.agent_name;

    // Generate participant token
    const participantName = phone ? `Caller ${phone.slice(-4)}` : 'user';
    const participantIdentity = phone 
      ? `${phone}_user_${Math.floor(Math.random() * 10_000)}`
      : `voice_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = orgId 
      ? `org_${orgId}_${Math.floor(Math.random() * 10_000)}`
      : `voice_room_${Math.floor(Math.random() * 10_000)}`;

    const metadata = orgId ? JSON.stringify({ organization_id: orgId }) : undefined;

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