import { Session } from 'next-auth';

import { createBlobStorageClient } from '@/lib/services/blobStorageFactory';

import { appendMetadataToStream } from '@/lib/utils/app/metadata';
import { retryAsync, retryWithExponentialBackoff } from '@/lib/utils/app/retry';
import { parseAndQueryFileOpenAI } from '@/lib/utils/app/stream/documentSummary';
import { getUserIdFromSession } from '@/lib/utils/app/user/session';
import { BlobProperty } from '@/lib/utils/server/blob';
import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { FileMessageContent, Message, TextMessageContent } from '@/types/chat';

import { AzureMonitorLoggingService } from '../loggingService';
import { TranscriptionServiceFactory } from '../transcriptionService';

import fs from 'fs';

/**
 * Handles file conversation processing including file download and analysis
 */
export class FileConversationHandler {
  constructor(private loggingService: AzureMonitorLoggingService) {}

  /**
   * Check if a file is an audio or video file based on its extension
   * Whisper API supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
   */
  private isAudioOrVideoFile(filename: string): boolean {
    const audioVideoExtensions = [
      '.mp3',
      '.mp4',
      '.mpeg',
      '.mpga',
      '.m4a',
      '.wav',
      '.webm',
    ];
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return audioVideoExtensions.includes(ext);
  }

  /**
   * Handles a file conversation by processing the file and returning a response.
   * @param {Message[]} messagesToSend - The messages to send in the conversation.
   * @returns {Promise<Response>} A promise that resolves to the response containing the processed file content.
   */
  async handleFileConversation(
    messagesToSend: Message[],
    modelId: string,
    user: Session['user'],
    botId: string | undefined,
    streamResponse: boolean,
  ): Promise<Response> {
    const startTime = Date.now();
    let fileBuffer: Buffer | undefined;
    let filename: string | undefined;

    return retryWithExponentialBackoff(async () => {
      const lastMessage: Message = messagesToSend[messagesToSend.length - 1];

      // Handle both array and non-array content
      let content: Array<TextMessageContent | FileMessageContent>;
      if (Array.isArray(lastMessage.content)) {
        content = lastMessage.content as Array<
          TextMessageContent | FileMessageContent
        >;
      } else {
        throw new Error('Expected array content for file conversation');
      }

      let prompt: string = '';
      let fileUrl: string | null = null;
      let originalFilename: string | undefined;
      content.forEach((section) => {
        if (section.type === 'text') prompt = section.text;
        else if (section.type === 'file_url') {
          fileUrl = section.url;
          originalFilename = section.originalFilename;
        } else
          throw new Error(
            `Unexpected content section type: ${JSON.stringify(section)}`,
          );
      });

      // Note: prompt can be empty string for audio/video files with no additional instructions
      // Prompt is optional - it stays as '' if no text content was provided
      if (!fileUrl) throw new Error('Could not find file URL!');

      // Use blob hash for file operations, but keep original filename for display
      const blobId = (fileUrl as string).split('/').pop();
      if (!blobId) throw new Error('Could not parse blob ID from URL!');

      filename = originalFilename || blobId; // Use original filename if available (guaranteed to be string)
      const filePath = `/tmp/${blobId}`; // Use blob ID for file path to avoid conflicts

      // TypeScript assertion: filename is guaranteed to be a string at this point
      if (!filename) throw new Error('Filename is required');

      try {
        console.log('[FileHandler] Processing file:', sanitizeForLog(filename));
        console.log('[FileHandler] Prompt:', sanitizeForLog(prompt));
        console.log(
          '[FileHandler] Stream response:',
          sanitizeForLog(streamResponse),
        );

        await this.downloadFile(fileUrl, filePath, user);
        console.log('[FileHandler] File downloaded successfully.');

        fileBuffer = await this.retryReadFile(filePath);
        console.log(
          '[FileHandler] File read successfully, size:',
          fileBuffer.length,
        );

        // Check if this is an audio or video file for transcription
        if (this.isAudioOrVideoFile(filename)) {
          console.log(
            '[FileHandler] Detected audio/video file, starting transcription...',
          );

          const transcriptionService =
            TranscriptionServiceFactory.getTranscriptionService('whisper');
          const transcript = await transcriptionService.transcribe(filePath);

          console.log(
            '[FileHandler] Transcription completed successfully, length:',
            transcript.length,
          );

          // If user provided additional instructions, process the transcript accordingly
          if (prompt && prompt.trim().length > 0) {
            console.log(
              '[FileHandler] User provided instructions for transcript:',
              sanitizeForLog(prompt),
            );

            // Create a text file with the transcript content (not the audio binary!)
            // This allows parseAndQueryFileOpenAI to process it as a document
            const transcriptFile: File = new File(
              [transcript],
              filename.replace(/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i, '.txt'),
              { type: 'text/plain' },
            );
            const result = await parseAndQueryFileOpenAI({
              file: transcriptFile,
              prompt: prompt, // parseAndQueryFileOpenAI will process the file content and apply this prompt
              modelId,
              user,
              botId,
              loggingService: this.loggingService,
              stream: streamResponse,
            });

            console.log(
              '[FileHandler] Transcript processed with user instructions. Streaming:',
              sanitizeForLog(streamResponse),
            );

            // Return processed content with transcript metadata
            if (streamResponse) {
              console.log('[FileHandler] Preparing streaming response...');
              if (typeof result === 'string') {
                throw new Error(
                  'Expected a ReadableStream for streaming response',
                );
              }

              const combinedStream = new ReadableStream({
                async start(controller) {
                  // Stream the GPT-processed result
                  const reader = result.getReader();
                  let processedText = '';

                  try {
                    const decoder = new TextDecoder();
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      const chunk = decoder.decode(value, { stream: true });
                      processedText += chunk;
                      controller.enqueue(value);
                    }
                  } finally {
                    reader.releaseLock();
                  }

                  // Append metadata with transcript
                  appendMetadataToStream(controller, {
                    transcript: {
                      filename: filename!, // Non-null assertion: filename is guaranteed to exist
                      transcript,
                      processedContent: processedText,
                    },
                  });
                  controller.close();
                },
              });

              return new Response(combinedStream, {
                headers: {
                  'Content-Type': 'text/plain; charset=utf-8',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                },
              });
            } else {
              if (result instanceof ReadableStream) {
                throw new Error('Expected a string for non-streaming response');
              }

              return new Response(
                JSON.stringify({
                  text: result,
                  metadata: {
                    transcript: {
                      filename,
                      transcript,
                      processedContent: result,
                    },
                  },
                }),
                {
                  headers: { 'Content-Type': 'application/json' },
                },
              );
            }
          } else {
            // No additional instructions - return empty content with transcript metadata
            console.log(
              '[FileHandler] No instructions provided, returning transcript via metadata. Streaming:',
              sanitizeForLog(streamResponse),
            );

            if (streamResponse) {
              // For streaming, send empty content + metadata
              const stream = new ReadableStream({
                start(controller) {
                  // Send metadata with transcript
                  appendMetadataToStream(controller, {
                    transcript: {
                      filename: filename!, // Non-null assertion: filename is guaranteed to exist
                      transcript,
                    },
                  });
                  controller.close();
                },
              });
              return new Response(stream, {
                headers: {
                  'Content-Type': 'text/plain; charset=utf-8',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                },
              });
            } else {
              return new Response(
                JSON.stringify({
                  text: '',
                  metadata: {
                    transcript: {
                      filename,
                      transcript,
                    },
                  },
                }),
                {
                  headers: { 'Content-Type': 'application/json' },
                },
              );
            }
          }
        } else {
          // Regular document processing
          const file: File = new File(
            [new Uint8Array(fileBuffer)],
            filename,
            {},
          );

          const result = await parseAndQueryFileOpenAI({
            file,
            prompt,
            modelId,
            user,
            botId,
            loggingService: this.loggingService,
            stream: streamResponse,
          });

          console.log('File summarized successfully.');

          if (streamResponse) {
            if (typeof result === 'string') {
              throw new Error(
                'Expected a ReadableStream for streaming response',
              );
            }
            return new Response(result, {
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
              },
            });
          } else {
            if (result instanceof ReadableStream) {
              throw new Error('Expected a string for non-streaming response');
            }
            return new Response(JSON.stringify({ text: result }), {
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      } catch (error) {
        await this.loggingService.logFileError(
          startTime,
          error,
          modelId,
          user,
          filename,
          fileBuffer?.length,
          botId,
        );
        throw error;
      } finally {
        try {
          fs.unlinkSync(filePath);
        } catch (fileUnlinkError) {
          if (
            fileUnlinkError instanceof Error &&
            fileUnlinkError.message.startsWith(
              'ENOENT: no such file or directory, unlink',
            )
          ) {
            console.warn('File not found, but this is acceptable.');
          } else {
            console.error('Error unlinking file:', fileUnlinkError);
          }
        }
      }
    });
  }

  /**
   * Downloads a file from the specified URL and saves it to the specified file path.
   * @param {string} fileUrl - The URL of the file to download.
   * @param {string} filePath - The path where the downloaded file will be saved.
   * @returns {Promise<void>} A promise that resolves when the file is successfully downloaded.
   */
  private async downloadFile(
    fileUrl: string,
    filePath: string,
    user: Session['user'],
  ): Promise<void> {
    // Create a minimal session object for the factory
    const session: Session = { user, expires: '' } as Session;

    const userId = getUserIdFromSession(session);
    const remoteFilepath = `${userId}/uploads/files`;
    const id: string | undefined = fileUrl.split('/').pop();
    if (!id) throw new Error(`Could not find file id from URL: ${fileUrl}`);

    const blobStorage = createBlobStorageClient(session);
    const blob: Buffer = await (blobStorage.get(
      `${remoteFilepath}/${id}`,
      BlobProperty.BLOB,
    ) as Promise<Buffer>);

    // Write file with secure permissions (0o600 = read/write for owner only)
    await fs.promises.writeFile(filePath, new Uint8Array(blob), {
      mode: 0o600,
    });
  }

  /**
   * Retry reading a file with exponential backoff
   */
  private async retryReadFile(
    filePath: string,
    maxRetries: number = 2,
  ): Promise<Buffer> {
    return retryAsync(
      () => Promise.resolve(fs.readFileSync(filePath)),
      maxRetries,
      1000,
    );
  }
}
