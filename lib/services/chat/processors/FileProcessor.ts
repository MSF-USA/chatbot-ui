import { FileProcessingService } from '@/lib/services/chat';

import { WHISPER_MAX_SIZE } from '@/lib/utils/app/const';
import { parseAndQueryFileOpenAI } from '@/lib/utils/app/stream/documentSummary';
import { extractAudioFromVideo } from '@/lib/utils/server/audioExtractor';
import { validateBufferSignature } from '@/lib/utils/server/fileValidation';
import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { IBlobStorageClient } from '../../blobStorageClient';
import { BatchTranscriptionService } from '../../transcription/batchTranscriptionService';
import { TranscriptionServiceFactory } from '../../transcriptionService';
import { ChatContext } from '../pipeline/ChatContext';
import { BasePipelineStage } from '../pipeline/PipelineStage';
import { InputValidator } from '../validators/InputValidator';

import { isAudioVideoFile } from '@/lib/constants/fileTypes';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import fs from 'fs';

/**
 * Polls a batch transcription job until completion.
 *
 * @param service - BatchTranscriptionService instance
 * @param jobId - Job ID to poll
 * @param maxWaitMs - Maximum wait time in milliseconds (default 10 minutes)
 * @returns Promise resolving to the transcript text
 * @throws Error if job fails or times out
 */
async function pollBatchTranscription(
  service: BatchTranscriptionService,
  jobId: string,
  maxWaitMs: number = 600000,
): Promise<string> {
  const startTime = Date.now();
  const pollIntervals = [2000, 5000, 10000, 15000]; // Increasing intervals
  let pollIndex = 0;

  while (Date.now() - startTime < maxWaitMs) {
    const status = await service.getStatus(jobId);

    if (status.status === 'Succeeded') {
      return await service.getTranscript(jobId);
    }

    if (status.status === 'Failed') {
      throw new Error(
        `Batch transcription failed: ${status.error || 'Unknown error'}`,
      );
    }

    // Wait with increasing intervals
    const waitMs =
      pollIntervals[Math.min(pollIndex++, pollIntervals.length - 1)];
    console.log(
      `[FileProcessor] Batch transcription status: ${status.status}, waiting ${waitMs}ms...`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  throw new Error(`Batch transcription timed out after ${maxWaitMs / 1000}s`);
}

/**
 * FileProcessor handles file content processing in the pipeline.
 *
 * Responsibilities:
 * - Validates file sizes before download (prevents OOM)
 * - Downloads files from blob storage
 * - Extracts and processes file content
 * - Handles audio/video transcription
 * - Summarizes documents
 * - Passes images through if present (for mixed content)
 *
 * Modifies context:
 * - context.processedContent.fileSummaries
 * - context.processedContent.transcripts
 * - context.processedContent.images (passes through)
 */
export class FileProcessor extends BasePipelineStage {
  readonly name = 'FileProcessor';
  private tracer = trace.getTracer('file-processor');

  constructor(
    private fileProcessingService: FileProcessingService,
    private inputValidator: InputValidator,
    private blobStorageClient?: IBlobStorageClient,
  ) {
    super();
  }

  shouldRun(context: ChatContext): boolean {
    return context.hasFiles;
  }

  protected async executeStage(context: ChatContext): Promise<ChatContext> {
    return await this.tracer.startActiveSpan(
      'file.process',
      {
        attributes: {
          'user.id': context.user.id,
          'model.id': context.modelId,
        },
      },
      async (span) => {
        try {
          const lastMessage = context.messages[context.messages.length - 1];

          if (!Array.isArray(lastMessage.content)) {
            throw new Error('Expected array content for file processing');
          }

          const fileSummaries: Array<{
            filename: string;
            summary: string;
            originalContent: string;
          }> = [];

          const transcripts: Array<{
            filename: string;
            transcript: string;
          }> = [];

          // Extract files and images from message
          const files: Array<{
            url: string;
            originalFilename?: string;
            transcriptionLanguage?: string;
            transcriptionPrompt?: string;
          }> = [];
          const images: Array<{
            url: string;
            detail: 'auto' | 'low' | 'high';
          }> = [];
          let prompt = '';

          for (const section of lastMessage.content) {
            if (section.type === 'text') {
              prompt = section.text;
            } else if (section.type === 'file_url') {
              files.push({
                url: section.url,
                originalFilename: section.originalFilename,
                transcriptionLanguage: section.transcriptionLanguage,
                transcriptionPrompt: section.transcriptionPrompt,
              });
            } else if (section.type === 'image_url') {
              images.push({
                url: section.image_url.url,
                detail: section.image_url.detail || 'auto',
              });
            }
          }

          console.log(
            `[FileProcessor] Processing ${files.length} file(s), ${images.length} image(s)`,
          );

          // STEP 1: Validate all file sizes in parallel (I/O bound)
          console.log(`[FileProcessor] Validating file sizes...`);
          await Promise.all(
            files.map((file) =>
              this.inputValidator.validateFileSize(
                file.url,
                context.user,
                (url, user) =>
                  this.fileProcessingService.getFileSize(url, user),
              ),
            ),
          );

          // STEP 2: Download all files in parallel (I/O bound)
          console.log(
            `[FileProcessor] Downloading ${files.length} file(s) in parallel...`,
          );
          const downloadedFiles = await Promise.all(
            files.map(async (file) => {
              const [blobId, filePath] =
                this.fileProcessingService.getTempFilePath(file.url);
              const filename = file.originalFilename || blobId;

              console.log(
                `[FileProcessor] File data:`,
                JSON.stringify({
                  url: file.url,
                  originalFilename: file.originalFilename,
                  hasOriginalFilename: !!file.originalFilename,
                  blobId,
                  finalFilename: filename,
                }),
              );

              // Download file
              await this.fileProcessingService.downloadFile(
                file.url,
                filePath,
                context.user,
              );
              console.log(
                `[FileProcessor] Downloaded: ${sanitizeForLog(filename)}`,
              );

              // Read file into buffer
              const fileBuffer =
                await this.fileProcessingService.readFile(filePath);

              return {
                file,
                filename,
                filePath,
                fileBuffer,
              };
            }),
          );

          // STEP 3: Process files sequentially (CPU/API bound - avoid rate limiting)
          console.log(`[FileProcessor] Processing files sequentially...`);
          for (const {
            file,
            filename,
            filePath,
            fileBuffer,
          } of downloadedFiles) {
            try {
              // Check if audio/video
              if (isAudioVideoFile(filename)) {
                console.log(
                  `[FileProcessor] Transcribing audio/video: ${sanitizeForLog(filename)}`,
                );

                // Determine if this is a video file that needs audio extraction
                const validation = validateBufferSignature(
                  fileBuffer,
                  'any',
                  filename,
                );
                const isVideo = validation.detectedType === 'video';

                let fileToTranscribe = filePath;
                let extractedAudioPath: string | null = null;

                // Extract audio from video files before transcription
                if (isVideo) {
                  console.log(
                    `[FileProcessor] Detected video file, extracting audio: ${sanitizeForLog(filename)}`,
                  );
                  try {
                    const extraction = await extractAudioFromVideo(filePath);
                    fileToTranscribe = extraction.outputPath;
                    extractedAudioPath = extraction.outputPath;
                    console.log(
                      `[FileProcessor] Audio extracted to: ${extractedAudioPath}`,
                    );
                  } catch (extractionError) {
                    console.error(
                      `[FileProcessor] Audio extraction failed, attempting direct transcription:`,
                      extractionError,
                    );
                    // Fall back to direct transcription (might work for some formats)
                  }
                }

                try {
                  // Get file size to determine transcription service
                  const stats = await fs.promises.stat(fileToTranscribe);
                  const audioSize = stats.size;
                  const audioSizeMB = (audioSize / (1024 * 1024)).toFixed(1);

                  console.log(
                    `[FileProcessor] Audio file size: ${audioSizeMB}MB`,
                  );

                  let transcript: string;

                  // Route based on file size: ≤25MB → Whisper, >25MB → Batch
                  if (audioSize <= WHISPER_MAX_SIZE) {
                    // Whisper transcription (synchronous, ≤25MB)
                    console.log(
                      `[FileProcessor] Using Whisper transcription (≤25MB)`,
                    );

                    const transcriptionService =
                      TranscriptionServiceFactory.getTranscriptionService(
                        'whisper',
                      );

                    // Pass transcription options (language and prompt) if specified
                    const transcriptionOptions = {
                      language: file.transcriptionLanguage,
                      prompt: file.transcriptionPrompt,
                    };

                    transcript = await transcriptionService.transcribe(
                      fileToTranscribe,
                      transcriptionOptions,
                    );
                  } else {
                    // Batch transcription (asynchronous with polling, >25MB)
                    console.log(
                      `[FileProcessor] Using Batch transcription (>25MB)`,
                    );

                    // Batch transcription requires blob storage client
                    if (!this.blobStorageClient) {
                      throw new Error(
                        `Audio file (${audioSizeMB}MB) exceeds 25MB Whisper limit. ` +
                          `Batch transcription is not available - blobStorageClient not configured.`,
                      );
                    }

                    // Check if batch service is configured
                    const batchService = new BatchTranscriptionService();
                    if (!batchService.isConfigured()) {
                      throw new Error(
                        `Audio file (${audioSizeMB}MB) exceeds 25MB Whisper limit. ` +
                          `Batch transcription is not configured (missing AZURE_SPEECH_KEY).`,
                      );
                    }

                    // 1. Upload extracted audio to temp blob storage
                    const tempBlobPath = `${context.user.id}/uploads/temp/${Date.now()}_transcription_audio.mp3`;
                    const audioBuffer =
                      await fs.promises.readFile(fileToTranscribe);

                    console.log(
                      `[FileProcessor] Uploading audio to temp blob: ${tempBlobPath}`,
                    );

                    await this.blobStorageClient.upload(
                      tempBlobPath,
                      audioBuffer,
                      {
                        blobHTTPHeaders: {
                          blobContentType: 'audio/mpeg',
                        },
                      },
                    );

                    try {
                      // 2. Generate SAS URL for batch API access
                      const sasUrl =
                        await this.blobStorageClient.generateSasUrl(
                          tempBlobPath,
                          24, // 24 hour expiry
                        );

                      console.log(
                        `[FileProcessor] Submitting batch transcription job...`,
                      );

                      // 3. Submit batch transcription job
                      const jobId = await batchService.submitTranscription(
                        sasUrl,
                        file.transcriptionLanguage || 'en-US',
                      );

                      console.log(
                        `[FileProcessor] Batch job submitted: ${jobId}`,
                      );

                      // 4. Poll until complete (synchronous polling)
                      transcript = await pollBatchTranscription(
                        batchService,
                        jobId,
                      );

                      console.log(
                        `[FileProcessor] Batch transcription complete: ${transcript.length} chars`,
                      );

                      // 5. Delete batch job (cleanup Azure resources)
                      try {
                        await batchService.deleteTranscription(jobId);
                        console.log(
                          `[FileProcessor] Deleted batch job: ${jobId}`,
                        );
                      } catch (deleteError) {
                        console.warn(
                          `[FileProcessor] Failed to delete batch job ${jobId}:`,
                          deleteError,
                        );
                      }
                    } finally {
                      // 6. Delete temp blob (always cleanup)
                      try {
                        await this.blobStorageClient.delete(tempBlobPath);
                        console.log(
                          `[FileProcessor] Deleted temp blob: ${tempBlobPath}`,
                        );
                      } catch (blobDeleteError) {
                        console.warn(
                          `[FileProcessor] Failed to delete temp blob ${tempBlobPath}:`,
                          blobDeleteError,
                        );
                      }
                    }
                  }

                  transcripts.push({
                    filename,
                    transcript,
                  });

                  console.log(
                    `[FileProcessor] Transcription complete: ${transcript.length} chars`,
                  );
                } finally {
                  // Clean up extracted audio file if created
                  if (extractedAudioPath) {
                    try {
                      await this.fileProcessingService.cleanupFile(
                        extractedAudioPath,
                      );
                      console.log(
                        `[FileProcessor] Cleaned up extracted audio: ${extractedAudioPath}`,
                      );
                    } catch (cleanupError) {
                      console.warn(
                        `[FileProcessor] Failed to clean up extracted audio:`,
                        cleanupError,
                      );
                    }
                  }
                }
              } else {
                // Regular document processing
                console.log(
                  `[FileProcessor] Processing document: ${sanitizeForLog(filename)}`,
                );

                const docFile = new File(
                  [new Uint8Array(fileBuffer)],
                  filename,
                  {},
                );

                // Process with parseAndQueryFileOpenAI
                // Note: We get the summary as a string (non-streaming for pipeline)
                // Note: Images are NOT passed here - they remain in the message for the final chat
                const summary = await parseAndQueryFileOpenAI({
                  file: docFile,
                  prompt: prompt || 'Summarize this document',
                  modelId: context.modelId,
                  user: context.user,
                  botId: context.botId,
                  stream: false,
                  // Don't pass images - blob URLs aren't accessible to Azure OpenAI during summarization
                  // Images will be included in the final message content by StandardChatHandler
                  images: undefined,
                });

                if (typeof summary !== 'string') {
                  throw new Error(
                    'Expected string summary from parseAndQueryFileOpenAI',
                  );
                }

                fileSummaries.push({
                  filename,
                  summary,
                  originalContent: fileBuffer.toString('utf-8', 0, 1000), // First 1000 chars
                });

                console.log(
                  `[FileProcessor] Document processed: ${sanitizeForLog(filename)}`,
                );
              }
            } catch (error) {
              // Log processing error but continue with other files
              console.error(
                `[FileProcessor] Error processing ${sanitizeForLog(filename)}:`,
                error,
              );
              // Re-throw to be caught by BasePipelineStage error handling
              throw error;
            }
          }

          // STEP 4: Cleanup all temp files in parallel (I/O bound)
          console.log(
            `[FileProcessor] Cleaning up ${downloadedFiles.length} temp file(s)...`,
          );
          await Promise.all(
            downloadedFiles.map(({ filePath }) =>
              this.fileProcessingService.cleanupFile(filePath),
            ),
          );

          // Add span attributes
          span.setAttribute('file.count', files.length);
          span.setAttribute('file.summaries_count', fileSummaries.length);
          span.setAttribute('file.transcripts_count', transcripts.length);
          span.setAttribute('file.images_count', images.length);
          span.setStatus({ code: SpanStatusCode.OK });

          // Return context with processed content
          return {
            ...context,
            processedContent: {
              ...context.processedContent,
              fileSummaries:
                fileSummaries.length > 0 ? fileSummaries : undefined,
              transcripts: transcripts.length > 0 ? transcripts : undefined,
              images: images.length > 0 ? images : undefined,
            },
          };
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
