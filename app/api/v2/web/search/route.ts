import {Article, fetchAndParseNewsSearch} from "@/services/newsService";

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {fetchAndParseWebpage, HttpError} from "@/services/webpageService";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const n = parseInt(searchParams.get('n') ?? '10', 10); // default to 10 articles

  try {
    const articles = await fetchAndParseNewsSearch(q, n);
    const finalArticles: string[] = []
    for (const article of articles) {
      const content = await fetchAndParseWebpage(article.link);
      finalArticles.push(
        `\`\`\`${article.title}\n${content}\n\`\`\``
      )
    }

    return NextResponse.json(
      { content: finalArticles.join('\n\n') },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    // Handle custom HttpError or default to 500
    const status = error instanceof HttpError ? error.status : 500;
    const message = error.message || 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      {
        status: status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
