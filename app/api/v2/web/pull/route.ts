import { fetchAndParseWebpage } from "@/services/webpageService";
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
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
