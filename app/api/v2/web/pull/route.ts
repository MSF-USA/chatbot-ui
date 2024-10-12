export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { url } = await req.json();

    // Validate the URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, {
        status: 400,
      });
    }

    let validatedUrl: URL;
    try {
      validatedUrl = new URL(url);
      if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error: any) {
      return NextResponse.json({ error: 'Invalid URL format' }, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch(validatedUrl.toString());
    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to fetch the URL' }, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await resp.text();

    const $ = cheerio.load(html);
    $('script, iframe, style, link[rel="stylesheet"], noscript').remove();
    const textContent = $('body').text();

    // Clean up the text by replacing multiple whitespaces with a single space
    const cleanText = textContent.replace(/\s+/g, ' ').trim();

    return NextResponse.json({ content: cleanText }, {
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
