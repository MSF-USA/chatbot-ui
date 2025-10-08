import { isBase64, saveBase64AsFile, splitAudioFile, cleanUpFiles } from '@/lib/services/transcription/common';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { ITranscriptionService } from '@/types/transcription';
import { DefaultAzureCredential } from '@azure/identity';

export class WhisperTranscriptionService implements ITranscriptionService {
  private modelName: string = 'whisper-1';
  private endpoint?: string | null;
  private apiKey?: string | null;
  private deployment?: string;
  private client: null;
  private credential: DefaultAzureCredential;

  constructor() {
    const apiKey = process.env.WHISPER_API_KEY ?? process.env.OPENAI_API_KEY;
    const azureEndpoint = process.env.WHISPER_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.WHISPER_DEPLOYMENT ?? 'whisper';

    this.apiKey = apiKey;
    this.endpoint = azureEndpoint;
    this.deployment = deployment;
    this.client = null; // Not using the AzureOpenAI client
    this.credential = new DefaultAzureCredential();

    if (!this.endpoint || !this.deployment) {
      throw new Error('Azure OpenAI endpoint or deployment are not set.');
    }
  }

  async transcribe(input: string): Promise<string> {
    let filePath: string;

    if (isBase64(input)) {
      filePath = await saveBase64AsFile(input);
    } else {
      filePath = input;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    const audioSegments = await splitAudioFile(filePath, maxSize);

    const transcripts = [];
    for (const segmentPath of audioSegments) {
      const transcript = await this.transcribeSegment(segmentPath);
      transcripts.push(transcript);
    }

    const fullTranscript = transcripts.join(' ');

    // Clean up temporary files
    void cleanUpFiles([filePath, ...audioSegments]);

    return fullTranscript;
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
      const reqUrl: string = `${this.endpoint!.trim()}/openai/deployments/${this.deployment}/audio/transcriptions?api-version=2024-06-01`;
      const headers = formHeaders;
      if (this.apiKey) {
        headers['api-key'] = this.apiKey;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(reqUrl, {
        method: 'POST',
        body: formData as any,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.text || '';
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      throw new Error(`Error transcribing segment: ${errorMessage}`);
    }
  }
}
