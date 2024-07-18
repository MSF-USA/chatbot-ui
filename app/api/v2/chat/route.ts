import { NextRequest } from 'next/server';

import ChatService from '@/services/chatService';

export const maxDuration: number = 300;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const chatService = new ChatService();
    return await chatService.handleRequest(req);
  } catch (error: any) {
    const errorMessage = error.error?.message || 'An unexpected error occurred';
    const errorCode = error.status || 500;

    console.error(error);
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
