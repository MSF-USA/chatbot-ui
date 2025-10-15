import {isBase64, saveBase64AsFile, splitAudioFile, cleanUpFiles, convertToWav} from '@/lib/services/transcription/common';
import fs from 'fs';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import {ITranscriptionService} from "@/types/transcription";
import path from "path";

export class ACSTranscriptionService implements ITranscriptionService {
  private apiKey: string;
  private region: string;

  constructor() {
    const subscriptionKey = process.env.AZURE_SPEECH_API_KEY;
    const serviceRegion = process.env.AZURE_SPEECH_REGION;

    if (!subscriptionKey || !serviceRegion) {
      throw new Error('ACS API key or region is not set.');
    }
    this.apiKey = subscriptionKey;
    this.region = serviceRegion;
  }

  async transcribe(input: string): Promise<string> {
    let filePath: string;

    if (isBase64(input)) {
      filePath = await saveBase64AsFile(input);
    } else {
      filePath = input;
    }

    const maxSize = 25 * 1024 * 1024;
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
    let wavSegmentPath: string;
    let isConverted = false;

    // Check if the segment is already a WAV file
    if (path.extname(segmentPath).toLowerCase() === '.wav') {
      wavSegmentPath = segmentPath;
    } else {
      // Convert to WAV
      wavSegmentPath = segmentPath.replace(/\.\w+$/, '.wav');
      await convertToWav(segmentPath, wavSegmentPath);
      isConverted = true;

      // Clean up the original segment file
      fs.promises.unlink(segmentPath).catch(err => console.error(`Failed to delete segment file: ${segmentPath}`, err));
    }

    const pushStream = sdk.AudioInputStream.createPushStream();

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(wavSegmentPath)
        .on('data', function (arrayBuffer) {
          // @ts-ignore
          pushStream.write(arrayBuffer);
        })
        .on('end', function () {
          pushStream.close();
          resolve();
        })
        .on('error', function (err) {
          reject(err);
        });
    });

    const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(wavSegmentPath));
    const speechConfig = sdk.SpeechConfig.fromSubscription(this.apiKey, this.region);

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result: sdk.SpeechRecognitionResult) => {
          resolve(result);
          recognizer.close();
        },
        (error: string) => {
          console.error('Recognition error:', error);
          reject(new Error(error));
          recognizer.close();
        }
      );
    });

    // Clean up the WAV segment file
    await fs.promises.unlink(wavSegmentPath).catch(err => console.error(`Failed to delete WAV segment file: ${wavSegmentPath}`, err));

    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
      return result.text;
    } else if (result.reason === sdk.ResultReason.NoMatch) {
      console.warn('No speech recognized in segment:', segmentPath);
      return '';
    } else {
      const cancellationDetails = sdk.CancellationDetails.fromResult(result);
      throw new Error(
        `Speech recognition canceled, Reason: ${cancellationDetails.reason}, Error Details: ${cancellationDetails.errorDetails}`
      );
    }
  }
}
