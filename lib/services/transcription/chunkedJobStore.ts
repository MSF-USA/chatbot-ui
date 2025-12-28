/**
 * In-memory job state storage for chunked transcription.
 *
 * Stores the state of async chunked transcription jobs.
 * Jobs are tracked from submission through completion.
 *
 * Note: This is an in-memory store - jobs are lost on server restart.
 * For production persistence, consider Redis or database storage.
 */

export type ChunkedJobStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed';

export interface ChunkedJob {
  /** Unique job identifier */
  jobId: string;
  /** Current job status */
  status: ChunkedJobStatus;
  /** Total number of chunks to process */
  totalChunks: number;
  /** Number of chunks completed */
  completedChunks: number;
  /** Index of the chunk currently being processed */
  currentChunk: number;
  /** Combined transcript (only set when succeeded) */
  transcript?: string;
  /** Error message (only set when failed) */
  error?: string;
  /** Paths to chunk files (for cleanup) */
  chunkPaths: string[];
  /** Path to original audio file (for cleanup) */
  originalAudioPath?: string;
  /** Original filename for display */
  filename: string;
  /** Job creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/** In-memory store for chunked jobs */
const jobStore = new Map<string, ChunkedJob>();

/** How long to keep completed/failed jobs before cleanup (1 hour) */
const JOB_RETENTION_MS = 60 * 60 * 1000;

/**
 * Creates a new chunked transcription job.
 *
 * @param jobId - Unique job identifier
 * @param totalChunks - Total number of chunks to process
 * @param chunkPaths - Paths to the chunk files
 * @param filename - Original filename for display
 * @param originalAudioPath - Path to original extracted audio (for cleanup)
 */
export function createJob(
  jobId: string,
  totalChunks: number,
  chunkPaths: string[],
  filename: string,
  originalAudioPath?: string,
): void {
  const now = Date.now();

  const job: ChunkedJob = {
    jobId,
    status: 'pending',
    totalChunks,
    completedChunks: 0,
    currentChunk: 0,
    chunkPaths,
    originalAudioPath,
    filename,
    createdAt: now,
    updatedAt: now,
  };

  jobStore.set(jobId, job);

  console.log(
    `[ChunkedJobStore] Created job ${jobId}: ${totalChunks} chunks for "${filename}"`,
  );

  // Schedule cleanup of stale jobs
  scheduleCleanup();
}

/**
 * Updates job progress.
 *
 * @param jobId - Job identifier
 * @param completedChunks - Number of chunks completed
 * @param currentChunk - Index of chunk currently being processed
 */
export function updateProgress(
  jobId: string,
  completedChunks: number,
  currentChunk?: number,
): void {
  const job = jobStore.get(jobId);
  if (!job) {
    console.warn(`[ChunkedJobStore] updateProgress: Job ${jobId} not found`);
    return;
  }

  job.status = 'processing';
  job.completedChunks = completedChunks;
  if (currentChunk !== undefined) {
    job.currentChunk = currentChunk;
  }
  job.updatedAt = Date.now();

  console.log(
    `[ChunkedJobStore] Job ${jobId} progress: ${completedChunks}/${job.totalChunks} chunks`,
  );
}

/**
 * Marks a job as successfully completed.
 *
 * @param jobId - Job identifier
 * @param transcript - Combined transcript text
 */
export function completeJob(jobId: string, transcript: string): void {
  const job = jobStore.get(jobId);
  if (!job) {
    console.warn(`[ChunkedJobStore] completeJob: Job ${jobId} not found`);
    return;
  }

  job.status = 'succeeded';
  job.completedChunks = job.totalChunks;
  job.transcript = transcript;
  job.updatedAt = Date.now();

  console.log(
    `[ChunkedJobStore] Job ${jobId} completed successfully with ${transcript.length} chars`,
  );
}

/**
 * Marks a job as failed.
 *
 * @param jobId - Job identifier
 * @param error - Error message
 */
export function failJob(jobId: string, error: string): void {
  const job = jobStore.get(jobId);
  if (!job) {
    console.warn(`[ChunkedJobStore] failJob: Job ${jobId} not found`);
    return;
  }

  job.status = 'failed';
  job.error = error;
  job.updatedAt = Date.now();

  console.error(`[ChunkedJobStore] Job ${jobId} failed: ${error}`);
}

/**
 * Gets a job by ID.
 *
 * @param jobId - Job identifier
 * @returns The job, or undefined if not found
 */
export function getJob(jobId: string): ChunkedJob | undefined {
  return jobStore.get(jobId);
}

/**
 * Deletes a job from the store.
 *
 * @param jobId - Job identifier
 */
export function deleteJob(jobId: string): void {
  const deleted = jobStore.delete(jobId);
  if (deleted) {
    console.log(`[ChunkedJobStore] Deleted job ${jobId}`);
  }
}

/**
 * Lists all jobs (for debugging/monitoring).
 */
export function listJobs(): ChunkedJob[] {
  return Array.from(jobStore.values());
}

/**
 * Gets the number of active (non-completed) jobs.
 */
export function getActiveJobCount(): number {
  let count = 0;
  for (const job of jobStore.values()) {
    if (job.status === 'pending' || job.status === 'processing') {
      count++;
    }
  }
  return count;
}

// Cleanup timer reference
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Schedules cleanup of stale completed/failed jobs.
 * Runs every 10 minutes if there are jobs in the store.
 */
function scheduleCleanup(): void {
  if (cleanupTimer) {
    return; // Already scheduled
  }

  cleanupTimer = setTimeout(
    () => {
      cleanupTimer = null;
      runCleanup();

      // Reschedule if there are still jobs
      if (jobStore.size > 0) {
        scheduleCleanup();
      }
    },
    10 * 60 * 1000,
  ); // 10 minutes
}

/**
 * Removes stale completed/failed jobs from the store.
 */
function runCleanup(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [jobId, job] of jobStore.entries()) {
    // Only clean up completed or failed jobs
    if (job.status !== 'succeeded' && job.status !== 'failed') {
      continue;
    }

    // Check if job is old enough to clean up
    const age = now - job.updatedAt;
    if (age > JOB_RETENTION_MS) {
      jobStore.delete(jobId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(
      `[ChunkedJobStore] Cleanup: removed ${cleaned} stale jobs, ${jobStore.size} remaining`,
    );
  }
}
