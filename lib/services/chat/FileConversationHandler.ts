import { JWT, Session } from 'next-auth';
import fs from 'fs';
import { StreamingTextResponse } from 'ai';

import { Message, FileMessageContent, TextMessageContent } from '@/types/chat';
import { AzureBlobStorage, BlobProperty } from '@/lib/utils/server/blob';
import { getEnvVariable } from '@/lib/utils/app/env';
import { parseAndQueryFileOpenAI } from '@/lib/utils/app/documentSummary';
import { retryWithExponentialBackoff, retryAsync } from '@/lib/utils/app/retry';
import { AzureMonitorLoggingService } from '../loggingService';

/**
 * Handles file conversation processing including file download and analysis
 */
export class FileConversationHandler {
  constructor(private loggingService: AzureMonitorLoggingService) {}

  /**
   * Handles a file conversation by processing the file and returning a response.
   * @param {Message[]} messagesToSend - The messages to send in the conversation.
   * @returns {Promise<Response>} A promise that resolves to the response containing the processed file content.
   */
  async handleFileConversation(
    messagesToSend: Message[],
    token: JWT,
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
      const content = lastMessage.content as Array<
        TextMessageContent | FileMessageContent
      >;

      let prompt: string | null = null;
      let fileUrl: string | null = null;
      content.forEach((section) => {
        if (section.type === 'text') prompt = section.text;
        else if (section.type === 'file_url') fileUrl = section.url;
        else
          throw new Error(
            `Unexpected content section type: ${JSON.stringify(section)}`,
          );
      });

      if (!prompt) throw new Error('Could not find text content type!');
      if (!fileUrl) throw new Error('Could not find file URL!');

      filename = (fileUrl as string).split('/').pop();
      if (!filename) throw new Error('Could not parse filename from URL!');
      const filePath = `/tmp/${filename}`;

      try {
        await this.downloadFile(fileUrl, filePath, token, user);
        console.log('File downloaded successfully.');

        fileBuffer = await this.retryReadFile(filePath);
        const file: File = new File([new Uint8Array(fileBuffer)], filename, {});

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
            throw new Error('Expected a ReadableStream for streaming response');
          }
          return new StreamingTextResponse(result);
        } else {
          if (result instanceof ReadableStream) {
            throw new Error('Expected a string for non-streaming response');
          }
          return new Response(JSON.stringify({ text: result }), {
            headers: { 'Content-Type': 'application/json' },
          });
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
    token: JWT,
    user: Session['user'],
  ): Promise<void> {
    const userId: string = user?.id ?? (token as any).userId ?? 'anonymous';
    const remoteFilepath = `${userId}/uploads/files`;
    const id: string | undefined = fileUrl.split('/').pop();
    if (!id) throw new Error(`Could not find file id from URL: ${fileUrl}`);

    const blobStorage = new AzureBlobStorage(
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_NAME', user }),
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_KEY', user }),
      getEnvVariable({
        name: 'AZURE_BLOB_STORAGE_CONTAINER',
        throwErrorOnFail: false,
        defaultValue: process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? '',
        user,
      }),
      user,
    );
    const blob: Buffer = await (blobStorage.get(
      `${remoteFilepath}/${id}`,
      BlobProperty.BLOB,
    ) as Promise<Buffer>);

    fs.writeFile(filePath, new Uint8Array(blob), () => null);
  }

  /**
   * Retry reading a file with exponential backoff
   */
  private async retryReadFile(filePath: string, maxRetries: number = 2): Promise<Buffer> {
    return retryAsync(
      () => Promise.resolve(fs.readFileSync(filePath)),
      maxRetries,
      1000
    );
  }
}
