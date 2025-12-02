import type DOMPurifyType from 'dompurify';

/** Cached DOMPurify instance (shared across all consumers) */
let cachedDOMPurify: typeof DOMPurifyType | null = null;

/**
 * Dynamically load DOMPurify (works on both client and server).
 * Uses isomorphic-dompurify which handles SSR via jsdom.
 *
 * Dynamic import avoids Next.js bundler path resolution issues
 * that occur with top-level imports of isomorphic-dompurify.
 *
 * @returns DOMPurify instance
 */
export async function getDOMPurify(): Promise<typeof DOMPurifyType> {
  if (!cachedDOMPurify) {
    const module = await import('isomorphic-dompurify');
    cachedDOMPurify = module.default;
  }
  return cachedDOMPurify;
}
