import { NextRequest, NextResponse } from 'next/server';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { Readable } from 'stream';
import { cleanMarkdown } from "@/lib/utils/app/clean";
import {Session} from "next-auth";
import {auth} from "@/auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session: Session | null = await auth();
  if (!session) throw new Error("Failed to pull session!");

  try {
    const { text } = await request.json();
    const cleanedText = cleanMarkdown(text);
    if (!text || !cleanedText) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_API_KEY!,
      process.env.AZURE_SPEECH_REGION!
    );
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        cleanedText,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            // 3. Stream the audio file back to the user
            const audioData = result.audioData;
            const stream = new Readable();
            stream.push(Buffer.from(audioData));
            stream.push(null);

            const response = new NextResponse(stream as any, {
              status: 200,
              headers: {
                "Content-Type": "audio/mpeg",
                "Content-Disposition": 'attachment; filename="speech.mp3"',
              },
            });

            resolve(response);
          } else {
            reject(new Error(`Speech synthesis canceled, reason: ${result.reason}`));
          }
          synthesizer.close();
        },
        (error) => {
          synthesizer.close();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Error in text-to-speech conversion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
