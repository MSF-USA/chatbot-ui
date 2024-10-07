import {isBase64, saveBase64AsFile, splitAudioFile, cleanUpFiles, convertToWav} from '@/services/transcription/common';
import fs from 'fs';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import {ITranscriptionService} from "@/types/transcription";

export class ACSTranscriptionService implements ITranscriptionService {
  private apiKey: string;
  private region: string;

  constructor() {
    const subscriptionKey = process.env.ACS_API_KEY;
    const serviceRegion = process.env.ACS_REGION;

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

    const maxSize = 25 * 1024 * 1024; // Adjust if different for ACS
    const audioSegments = await splitAudioFile(filePath, maxSize);

    const transcripts = [];
    for (const segmentPath of audioSegments) {
      const transcript = await this.transcribeSegment(segmentPath);
      transcripts.push(transcript);
    }

    const fullTranscript = transcripts.join(' ');

    // Clean up temporary files
    await cleanUpFiles([filePath, ...audioSegments]);

    return fullTranscript;
  }

  private async transcribeSegment(segmentPath: string): Promise<string> {
    const wavSegmentPath = segmentPath.replace(/\.\w+$/, '.wav');
    await convertToWav(segmentPath, wavSegmentPath);

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

    const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const speechConfig = sdk.SpeechConfig.fromSubscription(this.apiKey, this.region);
    // speechConfig.speechRecognitionLanguage = 'en-US';

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result: sdk.SpeechRecognitionResult) => {
          console.log('Recognition result:', result);
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

