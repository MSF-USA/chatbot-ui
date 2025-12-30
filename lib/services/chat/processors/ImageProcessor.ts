import { convertImagesToBase64 } from '@/lib/utils/server/image/blobToBase64';

import { ChatContext } from '../pipeline/ChatContext';
import { BasePipelineStage } from '../pipeline/PipelineStage';

/**
 * ImageProcessor handles image content in the pipeline.
 *
 * Responsibilities:
 * - Extracts image URLs from messages
 * - Converts Azure Blob Storage URLs to base64 data URLs for LLM consumption
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

    // Convert blob storage URLs to base64 data URLs for LLM consumption
    // LLMs cannot access private Azure blob URLs directly
    const convertedImages = await convertImagesToBase64(images, context.user);

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
