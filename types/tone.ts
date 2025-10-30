import { OpenAIModel } from './openai';

export interface Tone {
  id: string;
  name: string;
  description: string;
  voiceRules: string; // Main content - writing style guidelines
  examples?: string; // Optional usage examples to demonstrate the tone
  tags?: string[]; // For searching/filtering
  createdAt: string;
  updatedAt?: string;
  folderId: string | null;
  model?: OpenAIModel; // Optional: preferred model for this tone
}

export interface ToneExport {
  version: number;
  tones: Tone[];
  exportedAt: string;
}
