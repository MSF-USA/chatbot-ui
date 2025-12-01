import { Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { cleanMarkdown } from '@/lib/utils/app/clean';

import { auth } from '@/auth';
import { env } from '@/config/environment';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { Readable } from 'stream';

/**
 * Converts chat response text to speech using Azure Speech Services
 * POST /api/chat/tts
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session: Session | null = await auth();
  if (!session) throw new Error('Failed to pull session!');

  try {
    const { text } = await request.json();

    // Validate input before processing - check raw input, not processed output
    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const cleanedText = cleanMarkdown(text);

    // Additional safety check after sanitization
    if (!cleanedText || cleanedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text could not be processed' },
        { status: 400 },
      );
    }

    // Azure Speech Services configuration - using managed identity (Entra ID)
    const region = 'eastus2';

    // Get token from DefaultAzureCredential for Cognitive Services
    const { DefaultAzureCredential } = await import('@azure/identity');
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken(
      'https://cognitiveservices.azure.com/.default',
    );

    if (!tokenResponse || !tokenResponse.token) {
      throw new Error('Failed to get authentication token for Speech Services');
    }

    // Create speech config with authorization token (managed identity)
    const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(
      tokenResponse.token,
      region,
    );
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        cleanedText,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            // Stream the audio file back to the user
            const audioData = result.audioData;
            const stream = new Readable();
            stream.push(Buffer.from(audioData));
            stream.push(null);

            const response = new NextResponse(stream as any, {
              status: 200,
              headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'attachment; filename="speech.mp3"',
              },
            });

            resolve(response);
          } else {
            // Get detailed cancellation error information
            const cancellationDetails =
              sdk.CancellationDetails.fromResult(result);
            const errorDetails = `Speech synthesis canceled. Reason: ${cancellationDetails.reason}, ErrorCode: ${cancellationDetails.ErrorCode}, ErrorDetails: ${cancellationDetails.errorDetails}`;
            console.error(errorDetails);
            reject(new Error(errorDetails));
          }
          synthesizer.close();
        },
        (error) => {
          console.error('TTS error callback:', error);
          synthesizer.close();
          reject(error);
        },
      );
    });
  } catch (error) {
    console.error('Error in text-to-speech conversion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
