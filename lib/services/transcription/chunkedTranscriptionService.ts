/**
 * Chunked Transcription Service
 *
 * Handles transcription of large audio files (>25MB) by:
 * 1. Splitting the audio into smaller chunks using FFmpeg
 * 2. Transcribing each chunk using the Whisper API
 * 3. Combining the results with chunk markers
 *
 * This replaces the unreliable Azure Batch Transcription service
 * with a more reliable chunked approach using the same Whisper API
 * that works for small files.
 */
import {
  cleanupChunks,
  isAudioSplittingAvailable,
  splitAudioFile,
} from '@/lib/utils/server/audio/audioSplitter';

import { TranscriptionOptions } from '@/types/transcription';

import {
  ChunkedJob,
  completeJob,
  createJob,
  failJob,
  getJob,
  updateProgress,
} from './chunkedJobStore';
import { WhisperTranscriptionService } from './whisperTranscriptionService';

import { v4 as uuidv4 } from 'uuid';

/** Delay between chunk transcriptions to avoid rate limiting (ms) */
const DELAY_BETWEEN_CHUNKS_MS = 500;

/** Maximum retries for a single chunk */
const MAX_CHUNK_RETRIES = 2;

/** Delay before retry after failure (ms) */
const RETRY_DELAY_MS = 2000;

export interface ChunkedTranscriptionOptions extends TranscriptionOptions {
  /** Called when progress is updated */
  onProgress?: (completed: number, total: number) => void;
}

export interface ChunkedJobStartResult {
  /** Unique job identifier for polling */
  jobId: string;
  /** Total number of chunks to process */
  totalChunks: number;
}

/**
 * Service for transcribing large audio files using chunked processing.
 */
export class ChunkedTranscriptionService {
  private whisperService: WhisperTranscriptionService;

  constructor() {
    this.whisperService = new WhisperTranscriptionService();
  }

  /**
   * Checks if chunked transcription is available.
   * Requires FFmpeg and FFprobe for audio splitting.
   */
  isAvailable(): boolean {
    return isAudioSplittingAvailable();
  }

  /**
   * Starts an async chunked transcription job.
   *
   * Returns immediately with job ID; processing continues in background.
   * Use getStatus() or the status API to poll for progress.
   *
   * @param audioPath - Path to the audio file to transcribe
   * @param filename - Original filename for display
   * @param options - Transcription options (language, etc.)
   * @returns Job ID and total chunk count
   */
  async startJob(
    audioPath: string,
    filename: string,
    options?: ChunkedTranscriptionOptions,
  ): Promise<ChunkedJobStartResult> {
    // Verify FFmpeg is available
    if (!this.isAvailable()) {
      throw new Error(
        'Chunked transcription is not available. FFmpeg/FFprobe not found.',
      );
    }

    // Split the audio file into chunks
    console.log(`[ChunkedTranscription] Splitting audio file: ${audioPath}`);
    const splitResult = await splitAudioFile(audioPath, {
      targetChunkSizeBytes: 20 * 1024 * 1024, // 20MB chunks
      outputFormat: 'mp3',
    });

    const jobId = uuidv4();
    const { chunkPaths, chunkCount, totalDurationSecs, chunkDurationSecs } =
      splitResult;

    console.log(
      `[ChunkedTranscription] Created job ${jobId}: ${chunkCount} chunks ` +
        `(~${chunkDurationSecs}s each, ${totalDurationSecs.toFixed(0)}s total)`,
    );

    // Create job in store
    createJob(jobId, chunkCount, chunkPaths, filename, audioPath);

    // Start async processing (don't await - runs in background)
    this.processChunksAsync(jobId, chunkPaths, filename, options).catch(
      (error) => {
        console.error(
          `[ChunkedTranscription] Background processing error for ${jobId}:`,
          error,
        );
        failJob(jobId, error.message || 'Unknown error');
      },
    );

    return {
      jobId,
      totalChunks: chunkCount,
    };
  }

  /**
   * Gets the current status of a job.
   *
   * @param jobId - Job identifier
   * @returns Job status, or undefined if not found
   */
  getStatus(jobId: string): ChunkedJob | undefined {
    return getJob(jobId);
  }

  /**
   * Processes chunks asynchronously in the background.
   *
   * This method is called without await from startJob() and runs
   * independently, updating the job store as it progresses.
   */
  private async processChunksAsync(
    jobId: string,
    chunkPaths: string[],
    filename: string,
    options?: ChunkedTranscriptionOptions,
  ): Promise<void> {
    const transcripts: string[] = [];
    const totalChunks = chunkPaths.length;

    console.log(
      `[ChunkedTranscription] Starting async processing for job ${jobId}`,
    );

    try {
      for (let i = 0; i < chunkPaths.length; i++) {
        const chunkPath = chunkPaths[i];
        const chunkNum = i + 1;

        // Update progress at start of each chunk
        updateProgress(jobId, i, i);

        console.log(
          `[ChunkedTranscription] Transcribing chunk ${chunkNum}/${totalChunks}: ${chunkPath}`,
        );

        // Transcribe with retry logic
        const transcript = await this.transcribeChunkWithRetry(
          chunkPath,
          chunkNum,
          totalChunks,
          options,
        );

        transcripts.push(transcript);

        // Call progress callback if provided
        options?.onProgress?.(chunkNum, totalChunks);

        // Rate limit delay between chunks (except for last chunk)
        if (i < chunkPaths.length - 1) {
          await delay(DELAY_BETWEEN_CHUNKS_MS);
        }
      }

      // Combine transcripts with chunk markers
      const combinedTranscript = this.combineTranscripts(
        transcripts,
        totalChunks,
      );

      // Mark job as complete
      completeJob(jobId, combinedTranscript);

      console.log(
        `[ChunkedTranscription] Job ${jobId} completed: ${combinedTranscript.length} chars`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[ChunkedTranscription] Job ${jobId} failed:`,
        errorMessage,
      );
      failJob(jobId, errorMessage);
      throw error;
    } finally {
      // Always clean up chunk files
      console.log(`[ChunkedTranscription] Cleaning up chunks for job ${jobId}`);
      await cleanupChunks(chunkPaths);
    }
  }

  /**
   * Transcribes a single chunk with retry logic.
   */
  private async transcribeChunkWithRetry(
    chunkPath: string,
    chunkNum: number,
    totalChunks: number,
    options?: TranscriptionOptions,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES + 1; attempt++) {
      try {
        const transcript = await this.whisperService.transcribe(
          chunkPath,
          options,
        );
        return transcript;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a rate limit error
        const isRateLimit =
          lastError.message.includes('rate limit') ||
          lastError.message.includes('capacity') ||
          lastError.message.includes('429');

        if (attempt <= MAX_CHUNK_RETRIES) {
          const waitTime = isRateLimit ? RETRY_DELAY_MS * 2 : RETRY_DELAY_MS;

          console.warn(
            `[ChunkedTranscription] Chunk ${chunkNum}/${totalChunks} failed ` +
              `(attempt ${attempt}/${MAX_CHUNK_RETRIES + 1}), retrying in ${waitTime}ms...`,
          );

          await delay(waitTime);
        }
      }
    }

    throw new Error(
      `Failed to transcribe chunk ${chunkNum}/${totalChunks} after ${MAX_CHUNK_RETRIES + 1} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Combines individual chunk transcripts into a single transcript.
   *
   * For multiple chunks, adds markers to show where each chunk begins.
   * For a single chunk, returns the transcript without markers.
   */
  private combineTranscripts(
    transcripts: string[],
    totalChunks: number,
  ): string {
    if (totalChunks === 1) {
      // Single chunk - no markers needed
      return transcripts[0] || '';
    }

    // Multiple chunks - add markers for transparency
    return transcripts
      .map((text, i) => {
        const chunkNum = i + 1;
        const trimmedText = text.trim();
        return `[Chunk ${chunkNum}/${totalChunks}]\n${trimmedText}`;
      })
      .join('\n\n');
  }
}

/**
 * Helper function to create a delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Singleton instance for convenience.
 */
let chunkedServiceInstance: ChunkedTranscriptionService | null = null;

/**
 * Gets the singleton chunked transcription service instance.
 */
export function getChunkedTranscriptionService(): ChunkedTranscriptionService {
  if (!chunkedServiceInstance) {
    chunkedServiceInstance = new ChunkedTranscriptionService();
  }
  return chunkedServiceInstance;
}
