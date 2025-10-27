import {
  cleanUpFiles,
  isBase64,
  saveBase64AsFile,
} from '@/lib/services/transcription/common';

import { ITranscriptionService } from '@/types/transcription';

import { DefaultAzureCredential } from '@azure/identity';
import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

export class WhisperTranscriptionService implements ITranscriptionService {
  private modelName: string = 'whisper-1';
  private endpoint?: string | null;
  private apiKey?: string | null;
  private deployment?: string;
  private client: null;
  private credential: DefaultAzureCredential;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = 'whisper'; // Standard deployment name for Whisper

    this.apiKey = apiKey;
    this.endpoint = azureEndpoint;
    this.deployment = deployment;
    this.client = null; // Not using the AzureOpenAI client
    this.credential = new DefaultAzureCredential();

    if (!this.endpoint) {
      throw new Error('AZURE_OPENAI_ENDPOINT is not set.');
    }
  }

  async transcribe(input: string): Promise<string> {
    let filePath: string;
    let shouldCleanup = false;

    if (isBase64(input)) {
      filePath = await saveBase64AsFile(input);
      shouldCleanup = true;
    } else {
      filePath = input;
    }

    try {
      // Check file size (Whisper API limit is 25MB)
      const maxSize = 25 * 1024 * 1024; // 25MB
      const fileSize = fs.statSync(filePath).size;

      if (fileSize > maxSize) {
        throw new Error(
          `Audio file size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds the maximum limit of 25MB. Please upload a shorter audio file.`,
        );
      }

      // Transcribe the file directly (Whisper supports mp3, mp4, mpeg, mpga, m4a, wav, webm)
      const transcript = await this.transcribeSegment(filePath);

      return transcript;
    } finally {
      // Clean up temporary file if we created it from base64
      if (shouldCleanup) {
        void cleanUpFiles([filePath]);
      }
    }
  }

  private async transcribeSegment(segmentPath: string): Promise<string> {
    const fileSize = fs.statSync(segmentPath).size;
    if (fileSize > 25 * 1024 * 1024) {
      throw new Error('Segment size exceeds the maximum allowed size of 25MB.');
    }

    const audioFile = fs.createReadStream(segmentPath);

    // Obtain the Azure AD token
    const scope = 'https://cognitiveservices.azure.com/.default';
    const accessToken = await this.credential.getToken(scope);
    const token = accessToken?.token;

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', this.modelName);

    const formHeaders = formData.getHeaders();

    try {
      const apiVersion = process.env.OPENAI_API_VERSION || '2025-04-01-preview';
      const reqUrl: string = `${this.endpoint!.trim()}/openai/deployments/${this.deployment}/audio/transcriptions?api-version=${apiVersion}`;
      const headers = formHeaders;
      if (this.apiKey) {
        headers['api-key'] = this.apiKey;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(reqUrl, {
        method: 'POST',
        body: formData as any,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`,
        );
      }

      const data = await response.json();
      return data.text || '';
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      throw new Error(`Error transcribing segment: ${errorMessage}`);
    }
  }
}
