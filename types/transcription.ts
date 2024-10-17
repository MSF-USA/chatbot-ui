export interface ITranscriptionService {
  transcribe(input: string): Promise<string>;
}
