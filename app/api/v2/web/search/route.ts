import { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

import { fetchAndParseBingSearch } from '@/services/bingService';
import { fetchAndParseWebpage } from '@/services/webpageService';

import { HttpError } from '@/utils/app/security';

import { SearchResult } from '@/types/bing';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

export const runtime = 'nodejs';

const formatArticle = (
  index: number,
  article: SearchResult,
  content: string,
): string => {
  return `\`\`\`article-${index}.md
# ${article.name}

## URL

${article.url}

# Content

${content}

## Citation Details

${JSON.stringify({
  title: article.name,
  url: article.url,
  displayUrl: article.displayUrl,
  language: article.language,
  dateLastCrawled: article.dateLastCrawled,
})}
\`\`\``;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session: Session | null = await getServerSession(authOptions as any);
  if (!session) throw new Error('Failed to pull session!');

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) {
    return NextResponse.json(
      { message: 'Please submit a query' },
      { status: 400 },
    );
  }

  // Get optional parameters with default values
  const mkt = searchParams.get('mkt') ?? 'en-US';
  const count = parseInt(searchParams.get('count') ?? '5', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  let safeSearch = searchParams.get('safeSearch') as
    | 'Off'
    | 'Moderate'
    | 'Strict'
    | null;
  if (!safeSearch || !['Off', 'Moderate', 'Strict'].includes(safeSearch)) {
    safeSearch = 'Moderate';
  }

  const textDecorations = searchParams.get('textDecorations') !== 'false';

  let textFormat = searchParams.get('textFormat') as 'Raw' | 'HTML' | null;
  if (!textFormat || !['Raw', 'HTML'].includes(textFormat)) {
    textFormat = 'Raw';
  }

  try {
    const articles: SearchResult[] = await fetchAndParseBingSearch({
      q,
      mkt,
      safeSearch,
      textDecorations,
      textFormat,
      count,
      offset,
    });

    const articlePromises = articles.map(async (article, index) => {
      const articleIndex = index + 1;
      try {
        const content = await fetchAndParseWebpage(article.url);
        return formatArticle(articleIndex, article, content);
      } catch (error) {
        return formatArticle(
          articleIndex,
          article,
          '*Failed to fetch content for article*',
        );
      }
    });

    const finalArticles = await Promise.all(articlePromises);

    return NextResponse.json(
      { content: finalArticles.join('\n\n') },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error.message || 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      {
        status: status,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
