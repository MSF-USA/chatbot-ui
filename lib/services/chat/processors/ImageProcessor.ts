import { getBlobBase64String } from '@/lib/utils/server/blob/blob';

import { ChatContext } from '../pipeline/ChatContext';
import { BasePipelineStage } from '../pipeline/PipelineStage';

/**
 * Extracts the filename from various URL formats.
 * Supports both old blob URLs and new `/api/file/{id}` format.
 *
 * @param url - The image URL (blob URL, /api/file/id, or data URL)
 * @returns The filename/id portion, or the full URL if already base64
 */
function extractFilename(url: string): string {
  // New format: /api/file/{filename}
  // Old format: https://xxx.blob.core.windows.net/.../filename
  // Both can use split('/').pop() to get the filename
  return url.split('/').pop() || url;
}

/**
 * ImageProcessor handles image content in the pipeline.
 *
 * Responsibilities:
 * - Extracts image URLs from messages
 * - Converts image references to base64 data URLs for LLM consumption
 * - Stores converted images in context for downstream handlers
 *
 * Modifies context:
 * - context.processedContent.images (with base64 data URLs)
 *
 * Note: LLMs cannot access private Azure blob URLs, so images must be
 * converted to base64 data URLs before being sent to the API.
 */
export class ImageProcessor extends BasePipelineStage {
  readonly name = 'ImageProcessor';

  shouldRun(context: ChatContext): boolean {
    // Only run if images are present AND no files
    // (If files are present, FileProcessor handles images too)
    return context.hasImages && !context.hasFiles;
  }

  protected async executeStage(context: ChatContext): Promise<ChatContext> {
    const lastMessage = context.messages[context.messages.length - 1];

    if (!Array.isArray(lastMessage.content)) {
      throw new Error('Expected array content for image processing');
    }

    const images: Array<{ url: string; detail: 'auto' | 'low' | 'high' }> = [];

    // Extract images from message
    for (const section of lastMessage.content) {
      if (section.type === 'image_url') {
        images.push({
          url: section.image_url.url,
          detail: section.image_url.detail || 'auto',
        });
      }
    }

    console.log(`[ImageProcessor] Found ${images.length} image(s)`);

    // Convert image references to base64 data URLs for LLM consumption
    // Uses getBlobBase64String which handles both data URL strings and binary content
    const convertedImages = await Promise.all(
      images.map(async (image) => {
        // Skip if already a base64 data URL
        if (image.url.startsWith('data:')) {
          return image;
        }

        const filename = extractFilename(image.url);
        const base64Url = await getBlobBase64String(
          context.user.id ?? 'anonymous',
          filename,
          'images',
          context.user,
        );
        return { url: base64Url, detail: image.detail };
      }),
    );

    console.log(
      `[ImageProcessor] Converted ${convertedImages.length} image(s) to base64`,
    );

    return {
      ...context,
      processedContent: {
        ...context.processedContent,
        images: convertedImages.length > 0 ? convertedImages : undefined,
      },
    };
  }
}
