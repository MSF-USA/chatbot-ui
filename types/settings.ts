export interface Settings {
  theme: 'light' | 'dark';
  temperature: number;
  voiceTone: string | undefined;
  voiceToneInstructions: string | undefined;
  systemPrompt: string;
  runTypeWriterIntroSetting: boolean;
  useKnowledgeBase: boolean;
}
