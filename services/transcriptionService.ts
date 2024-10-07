import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { AzureOpenAI } from 'openai'
import axios from 'axios';
import FormData from 'form-data';

const unlinkAsync = promisify(fs.unlink);

ffmpeg.setFfmpegPath(ffmpegStatic as string);

export default class TranscriptionService {
  private client: AzureOpenAI;
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

    console.log('Whisper endpoint', azureEndpoint);
    console.log('api key', apiKey);

    this.client = new AzureOpenAI({
      baseURL: azureEndpoint, apiKey: apiKey, deployment: 'whisper',
      apiVersion: '2024-06-01'
    });
  }

  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  }

  private async saveBase64AsFile(base64String: string): Promise<string> {
    const tempFilePath = path.join(os.tmpdir(), `temp_audio_${Date.now()}.wav`);
    const buffer = Buffer.from(base64String, 'base64');
    await fs.promises.writeFile(tempFilePath, buffer);
    return tempFilePath;
  }


  /**
   * Transcribes the given audio or video file.
   * @param filePath The path to the audio or video file.
   * @returns The transcribed text.
   */
  async transcribe(input: string): Promise<string> {
    let filePath: string;

    if (this.isBase64(input)) {
      filePath = await this.saveBase64AsFile(input);
    } else {
      filePath = input;
    }

    let audioFilePath = filePath;

    // TODO: Implement this better: currently only considers extension, which was causing issues
    // // Convert video to audio if necessary
    // if (await this.isVideoFile(filePath)) {
    //   audioFilePath = await this.convertVideoToAudio(filePath);
    // }

    // Split audio into segments if necessary
    const maxSize = 25 * 1024 * 1024; // 25MB
    const audioSegments = await this.splitAudioFile(audioFilePath, maxSize);

    const transcripts = [];
    for (const segmentPath of audioSegments) {
      const transcript = await this.transcribeSegment(segmentPath);
      transcripts.push(transcript);
    }

    const fullTranscript = transcripts.join(' ');

    fs.exists(audioFilePath, (exists: boolean) => {
      if (exists) {
        unlinkAsync(audioFilePath);
      }
    })
    for (const segmentPath of audioSegments) {
      fs.exists(segmentPath, (exists: boolean) => {
        if (exists) {
          unlinkAsync(segmentPath);
        }
      })
      // unlinkAsync(segmentPath);
    }

    return fullTranscript;
  }

  private async isVideoFile(filePath: string): Promise<boolean> {
    const extension = path.extname(filePath).toLowerCase();
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return videoExtensions.includes(extension);
  }

  private async convertVideoToAudio(videoFilePath: string): Promise<string> {
    const audioFilePath = path.join(
      os.tmpdir(),
      `${path.basename(videoFilePath, path.extname(videoFilePath))}_${Date.now()}.wav`
    );

    return new Promise<string>((resolve, reject) => {
      ffmpeg(videoFilePath)
        .output(audioFilePath)
        .noVideo()
        .audioCodec('pcm_s16le') // WAV format
        .format('wav')
        .on('end', () => {
          resolve(audioFilePath);
        })
        .on('error', (err) => {
          reject(new Error(`Error converting video to audio: ${err.message}`));
        })
        .run();
    });
  }

  private async splitAudioFile(filePath: string, maxSize: number): Promise<string[]> {
    const fileSize = fs.statSync(filePath).size;
    if (fileSize <= maxSize) {
      return [filePath];
    }

    const duration = await this.getAudioDuration(filePath);
    const numSegments = Math.ceil(fileSize / maxSize);
    const segmentDuration = duration / numSegments;

    // Split audio according to segment duration
    const segmentPaths: string[] = [];
    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const segmentPath = path.join(
        os.tmpdir(),
        `${path.basename(filePath, path.extname(filePath))}_segment_${i}_${Date.now()}.wav`
      );
      await this.extractAudioSegment(filePath, segmentPath, startTime, segmentDuration);
      segmentPaths.push(segmentPath);
    }

    return segmentPaths;
  }

  private getAudioDuration(filePath: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Error getting audio duration: ${err.message}`));
        } else {
          const duration = metadata.format.duration;
          resolve(duration || 0);
        }
      });
    });
  }

  private extractAudioSegment(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .output(outputPath)
        .noVideo()
        .audioCodec('pcm_s16le') // WAV format
        .format('wav')
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(new Error(`Error extracting audio segment: ${err.message}`));
        })
        .run();
    });
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
      const response = await axios.post(
        `${this.endpoint}/openai/deployments/${this.deployment}/audio/transcriptions?api-version=2024-06-01`,
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
