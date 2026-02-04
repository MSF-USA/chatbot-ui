/**
 * Azure Speech Batch Transcription Service
 *
 * Handles transcription of audio files >25MB using Azure Speech Batch API.
 * Supports files up to 1GB with asynchronous processing.
 *
 * @see https://learn.microsoft.com/en-us/azure/ai-services/speech-service/batch-transcription
 */
import { ITranscriptionService } from '@/types/transcription';

import { env } from '@/config/environment';

/**
 * Status of a batch transcription job
 */
export type BatchTranscriptionStatus =
  | 'NotStarted'
  | 'Running'
  | 'Succeeded'
  | 'Failed';

/**
 * Batch transcription job information
 */
export interface BatchTranscriptionJob {
  jobId: string;
  status: BatchTranscriptionStatus;
  createdDateTime: string;
  lastUpdatedDateTime?: string;
  displayName?: string;
  error?: string;
}

/**
 * Result of a successful batch transcription
 */
export interface BatchTranscriptionResult {
  transcript: string;
  durationMs?: number;
  locale: string;
}

/**
 * Azure Speech Batch Transcription Service
 *
 * Implements the batch transcription API for large audio files (>25MB).
 * The batch API is asynchronous - jobs are submitted and polled for completion.
 */
export class BatchTranscriptionService implements ITranscriptionService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const region = env.AZURE_SPEECH_REGION || 'eastus';
    this.baseUrl = `https://${region}.api.cognitive.microsoft.com/speechtotext/v3.2`;
    this.apiKey = env.AZURE_SPEECH_KEY || '';

    if (!this.apiKey) {
      console.warn(
        'AZURE_SPEECH_KEY not configured - batch transcription will not work',
      );
    }
  }

  /**
   * Validates that a job ID matches the expected Azure format.
   * Azure batch transcription job IDs are GUIDs.
   *
   * @param jobId - The job ID to validate
   * @throws Error if the job ID format is invalid
   */
  private validateJobId(jobId: string): void {
    // Azure uses standard GUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const guidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(jobId)) {
      throw new Error(
        `Invalid job ID format: ${jobId.substring(0, 50)}${jobId.length > 50 ? '...' : ''}`,
      );
    }
  }

  /**
   * Submits a transcription job to the batch API.
   *
   * @param blobUrl - SAS URL to the audio file in blob storage
   * @param locale - Language locale (default: en-US)
   * @returns Promise resolving to the job ID
   * @throws Error if submission fails
   */
  async submitTranscription(
    blobUrl: string,
    locale = 'en-US',
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Azure Speech API key not configured');
    }

    const displayName = `Transcription-${Date.now()}`;

    const response = await fetch(`${this.baseUrl}/transcriptions`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentUrls: [blobUrl],
        locale,
        displayName,
        properties: {
          wordLevelTimestampsEnabled: false,
          punctuationMode: 'DictatedAndAutomatic',
          profanityFilterMode: 'Masked',
          // Diarization can be enabled if needed
          diarizationEnabled: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Batch transcription submission failed:', errorText);
      throw new Error(`Failed to submit transcription: ${response.status}`);
    }

    const data = await response.json();

    // Extract job ID from the self link
    // Format: https://{region}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions/{id}
    const selfLink = data.self as string;
    const jobId = selfLink.split('/').pop();

    if (!jobId) {
      throw new Error('Failed to extract job ID from response');
    }

    return jobId;
  }

  /**
   * Gets the status of a transcription job.
   *
   * @param jobId - The transcription job ID
   * @returns Promise resolving to job status information
   * @throws Error if status check fails
   */
  async getStatus(jobId: string): Promise<BatchTranscriptionJob> {
    if (!this.apiKey) {
      throw new Error('Azure Speech API key not configured');
    }

    this.validateJobId(jobId);

    const response = await fetch(`${this.baseUrl}/transcriptions/${jobId}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get status: ${errorText}`);
    }

    const data = await response.json();

    return {
      jobId,
      status: data.status as BatchTranscriptionStatus,
      createdDateTime: data.createdDateTime,
      lastUpdatedDateTime: data.lastActionDateTime,
      displayName: data.displayName,
      error: data.properties?.error?.message,
    };
  }

  /**
   * Gets the transcript text from a completed transcription job.
   *
   * @param jobId - The transcription job ID
   * @returns Promise resolving to the transcript text
   * @throws Error if transcript retrieval fails
   */
  async getTranscript(jobId: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Azure Speech API key not configured');
    }

    this.validateJobId(jobId);

    // First, get the list of result files
    const filesResponse = await fetch(
      `${this.baseUrl}/transcriptions/${jobId}/files`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
      },
    );

    if (!filesResponse.ok) {
      throw new Error(
        `Failed to get transcript files: ${filesResponse.status}`,
      );
    }

    const filesData = await filesResponse.json();

    // Find the transcription result file
    const transcriptFile = filesData.values?.find(
      (f: { kind: string }) => f.kind === 'Transcription',
    );

    if (!transcriptFile) {
      throw new Error('No transcript file found in job results');
    }

    // Download the transcript content
    const transcriptResponse = await fetch(transcriptFile.links.contentUrl);

    if (!transcriptResponse.ok) {
      throw new Error(
        `Failed to download transcript: ${transcriptResponse.status}`,
      );
    }

    const transcriptData = await transcriptResponse.json();

    // Combine all recognized phrases into a single transcript
    // The batch API returns segments, we join them together
    const combinedText = transcriptData.combinedRecognizedPhrases
      ?.map((phrase: { display: string }) => phrase.display)
      .join(' ');

    if (!combinedText) {
      // Fallback: try to get text from recognized phrases
      const segments = transcriptData.recognizedPhrases
        ?.map(
          (phrase: { nBest?: Array<{ display: string }> }) =>
            phrase.nBest?.[0]?.display,
        )
        .filter(Boolean)
        .join(' ');

      return segments || '';
    }

    return combinedText;
  }

  /**
   * Deletes a transcription job and its results.
   *
   * @param jobId - The transcription job ID to delete
   * @throws Error if deletion fails
   */
  async deleteTranscription(jobId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Azure Speech API key not configured');
    }

    this.validateJobId(jobId);

    const response = await fetch(`${this.baseUrl}/transcriptions/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
    });

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      throw new Error(`Failed to delete transcription: ${errorText}`);
    }
  }

  /**
   * ITranscriptionService implementation.
   *
   * Note: The batch API is asynchronous, so this method is not suitable
   * for direct use. Use submitTranscription() followed by polling getStatus()
   * and getTranscript() instead.
   *
   * @throws Error - Batch transcription requires async workflow
   */
  async transcribe(_input: string): Promise<string> {
    throw new Error(
      'Batch transcription is asynchronous. Use submitTranscription() followed by getStatus() and getTranscript().',
    );
  }

  /**
   * Checks if the batch transcription service is configured and available.
   *
   * @returns true if the service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
