import { fetchAndParseWebpage } from "@/lib/services/webpageService";
import { NextRequest, NextResponse } from 'next/server';
import {Session} from "next-auth";
import {auth} from "@/auth";

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session: Session | null = await auth();
  if (!session) throw new Error("Failed to pull session!");

  try {
    const { url } = await req.json();

    const content = await fetchAndParseWebpage(url);


    return NextResponse.json({ content }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });


  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
