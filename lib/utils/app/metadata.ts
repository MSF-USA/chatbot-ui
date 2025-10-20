import { Citation } from '@/types/rag';

/**
 * Metadata object that can be embedded in streamed responses
 */
export interface StreamMetadata {
  citations?: Citation[];
  threadId?: string;
  thinking?: string;
}

/**
 * Result of parsing metadata from content
 */
export interface ParsedMetadata {
  content: string;
  citations: Citation[];
  threadId?: string;
  thinking?: string;
  extractionMethod: 'metadata' | 'none';
}

/**
 * Parses metadata from content using the standard format
 * Format: <<<METADATA_START>>>{json}<<<METADATA_END>>>
 *
 * @param content The text content to parse
 * @returns Object containing the cleaned text and extracted metadata
 */
export function parseMetadataFromContent(content: string): ParsedMetadata {
  let mainContent = content;
  let citations: Citation[] = [];
  let threadId: string | undefined;
  let thinking: string | undefined;
  let extractionMethod: ParsedMetadata['extractionMethod'] = 'none';

  // Check for metadata format
  const metadataMatch = content.match(
    /\n\n<<<METADATA_START>>>(.*?)<<<METADATA_END>>>/s,
  );
  if (metadataMatch) {
    extractionMethod = 'metadata';
    mainContent = content.replace(
      /\n\n<<<METADATA_START>>>.*?<<<METADATA_END>>>/s,
      '',
    );

    try {
      const parsedData = JSON.parse(metadataMatch[1]);
      if (parsedData.citations) {
        citations = parsedData.citations;
      }
      if (parsedData.threadId) {
        threadId = parsedData.threadId;
      }
      if (parsedData.thinking) {
        thinking = parsedData.thinking;
      }
    } catch (error) {
      console.error('Error parsing metadata JSON:', error);
    }
  }

  return {
    content: mainContent,
    citations,
    threadId,
    thinking,
    extractionMethod,
  };
}

/**
 * Appends metadata to a readable stream in the standard format
 * Uses the <<<METADATA_START>>>{json}<<<METADATA_END>>> format
 *
 * @param controller The ReadableStream controller
 * @param metadata The metadata to append
 */
export function appendMetadataToStream(
  controller: ReadableStreamDefaultController,
  metadata: StreamMetadata,
): void {
  const encoder = new TextEncoder();
  const separator = '\n\n<<<METADATA_START>>>';

  // Filter out undefined values
  const cleanMetadata: Partial<StreamMetadata> = {};
  if (metadata.citations) cleanMetadata.citations = metadata.citations;
  if (metadata.threadId) cleanMetadata.threadId = metadata.threadId;
  if (metadata.thinking) cleanMetadata.thinking = metadata.thinking;

  // Only append if we have actual metadata
  if (Object.keys(cleanMetadata).length > 0) {
    const metadataStr = `${separator}${JSON.stringify(cleanMetadata)}<<<METADATA_END>>>`;
    controller.enqueue(encoder.encode(metadataStr));
  }
}

/**
 * Creates a TextEncoder instance for stream encoding
 * Can be used for consistent encoder creation across the codebase
 */
export function createStreamEncoder(): TextEncoder {
  return new TextEncoder();
}

/**
 * Creates a TextDecoder instance for stream decoding
 * Can be used for consistent decoder creation across the codebase
 */
export function createStreamDecoder(): TextDecoder {
  return new TextDecoder();
}
