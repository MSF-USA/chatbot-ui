/**
 * Options for transcription services.
 *
 * @property language - ISO-639-1 language code (e.g., 'en', 'es', 'fr').
 *                      If undefined, Whisper will auto-detect the language.
 * @property prompt - Optional context/instructions to improve transcription accuracy.
 *                    Useful for technical terms, proper nouns, or specific formatting.
 */
export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
}

/**
 * Interface for transcription services.
 *
 * Implemented by:
 * - WhisperTranscriptionService: Synchronous transcription for files ≤25MB
 * - BatchTranscriptionService: Asynchronous transcription for files >25MB
 */
export interface ITranscriptionService {
  transcribe(input: string, options?: TranscriptionOptions): Promise<string>;
}

/**
 * Response from the transcription API endpoint.
 *
 * For synchronous (Whisper) transcription:
 *   - async: false
 *   - transcript: the transcribed text
 *
 * For asynchronous (Batch) transcription:
 *   - async: true
 *   - jobId: ID to poll for status
 */
export interface TranscriptionResponse {
  /** Whether this is an async (batch) transcription */
  async: boolean;
  /** The transcript text (only for sync transcriptions or completed async) */
  transcript?: string;
  /** Job ID for polling (only for async transcriptions) */
  jobId?: string;
}

/**
 * Status response when polling a batch transcription job.
 */
export interface BatchTranscriptionStatusResponse {
  /** Current status of the job */
  status: 'NotStarted' | 'Running' | 'Succeeded' | 'Failed';
  /** Transcript text (only when status is 'Succeeded') */
  transcript?: string;
  /** Error message (only when status is 'Failed') */
  error?: string;
  /** When the job was created */
  createdAt?: string;
  /** When the job completed (only when finished) */
  completedAt?: string;
  /** Human-readable status message */
  message?: string;
}
