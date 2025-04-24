import { fetchAndParseWebpage } from "@/services/webpageService";
import { NextRequest, NextResponse } from 'next/server';
import {Session} from "next-auth";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@/pages/api/auth/[...nextauth]";

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session: Session | null = await getServerSession(authOptions as any);
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
