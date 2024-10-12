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

    const resp = await fetch(
      validatedUrl.toString(),
      {headers: {
        'User-Agent': process.env.USER_AGENT ?? 'MSF Assistant'
      }}
    );
    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to fetch the URL' }, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await resp.text();

    const $ = cheerio.load(html);

    const title = $('title').text().trim() || 'No title found';
    const host = validatedUrl.host;

    $('script, iframe, style, link[rel="stylesheet"], noscript').remove();
    const textContent = $('body').text();
    const cleanText = textContent.replace(/\s+/g, ' ').trim();

    // Combine title, host, and content
    const finalContent = `Title: ${title}\nURL: ${host}\n\n${cleanText}`;

    return NextResponse.json({ content: finalContent }, {
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
