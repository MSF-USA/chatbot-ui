export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseWebpage, HttpError } from "@/services/webpageService";
import { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { fetchAndParseBingSearch } from "@/services/bingService";
import { SearchResult } from "@/types/bing";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session: Session | null = await getServerSession(authOptions as any);
  if (!session) throw new Error("Failed to pull session!");

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) {
    return NextResponse.json({message: "Please submit a query"}, {status: 400})
  }

  // Get optional parameters with default values
  const mkt = searchParams.get('mkt') ?? 'en-US';
  let safeSearch = searchParams.get('safeSearch') ?? 'Moderate';
  const count = parseInt(searchParams.get('count') ?? '5', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const textDecorations = searchParams.get('textDecorations') ? searchParams.get('textDecorations') === 'true' : true;
  let textFormat = searchParams.get('textFormat') ?? 'Raw';

  if (!['Off', 'Moderate', 'Strict'].includes(safeSearch))
    safeSearch = 'Moderate'

  textFormat = ['Raw', 'HTML'].includes(textFormat) ? textFormat : 'Raw'
  try {
    const articles: SearchResult[] = await fetchAndParseBingSearch({
      q,
      mkt,
      // @ts-expect-error Typescript not understanding logical flow of types is my favorite thing
      safeSearch,
      textDecorations,
      // @ts-expect-error Typescript again failing to do the only thing it is meant to do
      textFormat,
      count,
      offset,
    });
    const finalArticles: string[] = []
    let i = 1;
    for (const article of articles) {
      try {
        const content = await fetchAndParseWebpage(article.url);
        finalArticles.push(
          `\`\`\`article-${i}.md\n# ${article.name}\n\n## URL\n\n${article.url}\n\n# Content\n\n${content}\n\n## Citation Details\n\n${JSON.stringify({
            title: article.name,
            url: article.url,
            displayUrl: article.displayUrl,
            language: article.language,
            dateLastCrawled: article.dateLastCrawled
          })}\n\`\`\``
        )
      } catch (error) {
        finalArticles.push(
          `\`\`\`article-${i}.md\n# ${article.name}\n\n## URL\n\n${article.url}\n\n# Content\n\n*Failed to fetch content for article*\n\n${JSON.stringify({
            title: article.name,
            url: article.url,
            displayUrl: article.displayUrl,
            language: article.language,
            dateLastCrawled: article.dateLastCrawled
          })}\n\`\`\``
        )
      } finally {
        i++;
      }
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
