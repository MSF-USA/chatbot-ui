import { isBase64, saveBase64AsFile, splitAudioFile, cleanUpFiles } from '@/services/transcription/common';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import {ITranscriptionService} from "@/types/transcription";

export class WhisperTranscriptionService implements ITranscriptionService {
  private modelName: string = 'whisper';
  private endpoint: string;
  private apiKey: string;
  private deployment: string;

  constructor() {
    const apiKey = process.env.WHISPER_API_KEY;
    const azureEndpoint = process.env.WHISPER_ENDPOINT;
    const deployment = process.env.WHISPER_DEPLOYMENT;

    if (!apiKey || !azureEndpoint || !deployment) {
      throw new Error('Azure OpenAI API key, endpoint, or deployment are not set.');
    }
    this.apiKey = apiKey;
    this.endpoint = azureEndpoint;
    this.deployment = deployment;
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
    cleanUpFiles([filePath, ...audioSegments]);

    return fullTranscript;
  }

  private async transcribeSegment(segmentPath: string): Promise<string> {
    const fileSize = fs.statSync(segmentPath).size;
    if (fileSize > 25 * 1024 * 1024) {
      throw new Error('Segment size exceeds the maximum allowed size of 25MB.');
    }

    const audioFile = fs.createReadStream(segmentPath);

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', this.modelName);

    const formHeaders = formData.getHeaders();

    try {
      const reqUrl: string = `${this.endpoint.trim()}/openai/deployments/${this.deployment}/audio/transcriptions?api-version=2024-06-01`
      const response = await axios.post(
        reqUrl,
        formData,
        {
          headers: {
            'api-key': this.apiKey,
            ...formHeaders,
          },
        }
      );

      return response.data.text || '';
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Error transcribing segment: ${errorMessage}`);
    }
  }
}
