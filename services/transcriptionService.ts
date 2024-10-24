import {ITranscriptionService} from "@/types/transcription";
import {WhisperTranscriptionService} from "@/services/transcription/whisperTranscriptionService";
import {ACSTranscriptionService} from "@/services/transcription/azureSpeechTranscriptionService";


export class TranscriptionServiceFactory {
  static getTranscriptionService(method: 'whisper' | 'azureCognitiveSpeechService'): ITranscriptionService {
    if (method === 'whisper') {
      return new WhisperTranscriptionService();
    } else if (method === 'azureCognitiveSpeechService') {
      return new ACSTranscriptionService();
    } else {
      throw new Error('Invalid transcription method');
    }
  }
}

