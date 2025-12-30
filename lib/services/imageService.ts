import {
  FileMessageContent,
  ImageMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';

// In-memory cache for image base64 data to avoid re-fetching from server
const imageCache = new Map<string, string>();

/**
 * Cache base64 image data to avoid re-fetching from server
 */
export const cacheImageBase64 = (url: string, base64: string): void => {
  imageCache.set(url, base64);
};

/**
 * Resolves image file references (/api/file/...) to base64 data URLs.
 * Uses cached base64 if available, otherwise fetches from server.
 *
 * @param image - The image message content with a potential file reference URL
 * @returns The image with the URL resolved to a base64 data URL
 */
async function resolveImageReference(
  image: ImageMessageContent,
): Promise<ImageMessageContent> {
  const url = image.image_url?.url;

  // Already a data URL - no resolution needed
  if (!url || url.startsWith('data:')) {
    return image;
  }

  // Only resolve /api/file/ references
  if (!url.startsWith('/api/file/')) {
    return image;
  }

  // Try to get from cache or fetch
  const base64Url = await fetchImageBase64FromMessageContent(image);

  if (base64Url) {
    return {
      ...image,
      image_url: {
        ...image.image_url,
        url: base64Url,
      },
    };
  }

  // If fetch failed, return original (will likely fail on server too)
  return image;
}

/**
 * Resolves all image file references in message content to base64 data URLs.
 * This should be called before sending messages to the server.
 *
 * @param content - The message content (string or array of content items)
 * @returns The content with all image URLs resolved to base64 data URLs
 */
export async function resolveImageReferencesInContent(
  content: Message['content'],
): Promise<Message['content']> {
  // String content has no images to resolve
  if (typeof content === 'string') {
    return content;
  }

  // Single TextMessageContent has no images
  if (!Array.isArray(content)) {
    return content;
  }

  // Process array of content items
  const resolvedContent = await Promise.all(
    content.map(
      async (
        item,
      ): Promise<
        TextMessageContent | ImageMessageContent | FileMessageContent
      > => {
        if (item.type === 'image_url') {
          return resolveImageReference(item as ImageMessageContent);
        }
        return item;
      },
    ),
  );

  return resolvedContent;
}

/**
 * Fetch image base64 from cache or server
 * For images just uploaded, uses cached base64 to avoid unnecessary API calls
 */
export const fetchImageBase64FromMessageContent = async (
  image: ImageMessageContent,
): Promise<string> => {
  try {
    if (image?.image_url?.url) {
      // Check cache first (for recently uploaded images)
      const cached = imageCache.get(image.image_url.url);
      if (cached) {
        return cached;
      }

      // Fetch from server if not in cache (for loaded messages)
      const filename =
        image.image_url.url.split('/')[
          image.image_url.url.split('/').length - 1
        ];
      const page: Response = await fetch(
        `/api/file/${filename}?filetype=image`,
      );
      const resp = await page.json();

      // Cache the fetched data for future use
      if (resp.base64Url) {
        imageCache.set(image.image_url.url, resp.base64Url);
      }

      return resp.base64Url;
    } else {
      console.warn(
        `Couldn't find url in message content: ${JSON.stringify(image)}`,
      );
      return '';
    }
  } catch (error) {
    console.error('Error fetching the image:', error);
    return '';
  }
};
