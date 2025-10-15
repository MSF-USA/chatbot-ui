import { NextRequest } from 'next/server';

import ChatService from '@/lib/services/chatService';

export const maxDuration: number = 300;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const chatService = new ChatService();
    return await chatService.handleRequest(req);
  } catch (error) {
    console.error('Chat API error:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred';
    const errorCode = (error as { status?: number })?.status || 500;

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
