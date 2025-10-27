import { Session } from 'next-auth';

import { createBlobStorageClient } from '@/lib/services/blobStorageFactory';

import { parseAndQueryFileOpenAI } from '@/lib/utils/app/documentSummary';
import { retryAsync, retryWithExponentialBackoff } from '@/lib/utils/app/retry';
import { getUserIdFromSession } from '@/lib/utils/app/session';
import { BlobProperty } from '@/lib/utils/server/blob';

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
      content.forEach((section) => {
        if (section.type === 'text') prompt = section.text;
        else if (section.type === 'file_url') fileUrl = section.url;
        else
          throw new Error(
            `Unexpected content section type: ${JSON.stringify(section)}`,
          );
      });

      // Note: prompt can be empty string for audio/video files with no additional instructions
      // Prompt is optional - it stays as '' if no text content was provided
      if (!fileUrl) throw new Error('Could not find file URL!');

      filename = (fileUrl as string).split('/').pop();
      if (!filename) throw new Error('Could not parse filename from URL!');
      const filePath = `/tmp/${filename}`;

      try {
        console.log('[FileHandler] Processing file:', filename);
        console.log('[FileHandler] Prompt:', prompt);
        console.log('[FileHandler] Stream response:', streamResponse);

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
              prompt,
            );

            // Use parseAndQueryFileOpenAI's underlying logic to process with GPT
            const file: File = new File(
              [new Uint8Array(fileBuffer)],
              filename,
              {},
            );
            const result = await parseAndQueryFileOpenAI({
              file,
              prompt: `Here is the full transcription from ${filename}:\n\n${transcript}\n\nNow, ${prompt}`,
              modelId,
              user,
              botId,
              loggingService: this.loggingService,
              stream: streamResponse,
            });

            console.log('Transcript processed with user instructions.');

            if (streamResponse) {
              if (typeof result === 'string') {
                throw new Error(
                  'Expected a ReadableStream for streaming response',
                );
              }

              // For streaming, we need to prepend the original transcript
              const encoder = new TextEncoder();
              const transcriptHeader = `# Original Transcription: ${filename}\n\n\`\`\`\n${transcript}\n\`\`\`\n\n---\n\n# Processed Result\n\n`;

              const combinedStream = new ReadableStream({
                async start(controller) {
                  // Send the original transcript first
                  controller.enqueue(encoder.encode(transcriptHeader));

                  // Then stream the GPT response
                  const reader = result.getReader();
                  try {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      controller.enqueue(value);
                    }
                  } finally {
                    reader.releaseLock();
                    controller.close();
                  }
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

              // For non-streaming, prepend the original transcript
              const combinedResponse = `# Original Transcription: ${filename}\n\n\`\`\`\n${transcript}\n\`\`\`\n\n---\n\n# Processed Result\n\n${result}`;

              return new Response(JSON.stringify({ text: combinedResponse }), {
                headers: { 'Content-Type': 'application/json' },
              });
            }
          } else {
            // No additional instructions - just return the transcript
            const formattedResponse = `# Transcription: ${filename}\n\n\`\`\`\n${transcript}\n\`\`\``;

            if (streamResponse) {
              // For streaming, create a simple readable stream
              const encoder = new TextEncoder();
              const stream = new ReadableStream({
                start(controller) {
                  controller.enqueue(encoder.encode(formattedResponse));
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
              return new Response(JSON.stringify({ text: formattedResponse }), {
                headers: { 'Content-Type': 'application/json' },
              });
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
            throw fileUnlinkError;
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
