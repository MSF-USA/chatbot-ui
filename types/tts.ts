/**
 * Text-to-Speech (TTS) configuration types for Azure Speech Services.
 */

/** Gender of the TTS voice */
export type VoiceGender = 'Female' | 'Male' | 'Neutral';

/** Type/tier of the TTS voice */
export type VoiceType = 'Neural' | 'Multilingual' | 'DragonHD' | 'Turbo';

/**
 * Information about an available TTS voice.
 */
export interface VoiceInfo {
  /** Full voice name for Azure API (e.g., "en-US-AriaNeural") */
  name: string;
  /** Display name for UI (e.g., "Aria") */
  displayName: string;
  /** Voice gender */
  gender: VoiceGender;
  /** Voice type/tier */
  type: VoiceType;
  /** Locale code (e.g., "en-US") */
  locale: string;
}

/**
 * Available audio output formats for TTS.
 * Maps to Azure Speech SDK SpeechSynthesisOutputFormat enum values.
 */
export type TTSOutputFormat =
  | 'Audio16Khz32KBitRateMonoMp3'
  | 'Audio16Khz64KBitRateMonoMp3'
  | 'Audio24Khz48KBitRateMonoMp3'
  | 'Audio24Khz96KBitRateMonoMp3'
  | 'Audio48Khz96KBitRateMonoMp3'
  | 'Audio48Khz192KBitRateMonoMp3';

/**
 * Human-readable labels for output formats.
 */
export const OUTPUT_FORMAT_LABELS: Record<TTSOutputFormat, string> = {
  Audio16Khz32KBitRateMonoMp3: 'Low (16kHz, 32kbps)',
  Audio16Khz64KBitRateMonoMp3: 'Medium-Low (16kHz, 64kbps)',
  Audio24Khz48KBitRateMonoMp3: 'Medium (24kHz, 48kbps)',
  Audio24Khz96KBitRateMonoMp3: 'Medium-High (24kHz, 96kbps)',
  Audio48Khz96KBitRateMonoMp3: 'High (48kHz, 96kbps)',
  Audio48Khz192KBitRateMonoMp3: 'Very High (48kHz, 192kbps)',
};

/**
 * User-configurable TTS settings.
 */
export interface TTSSettings {
  /** Voice name for synthesis (e.g., "en-US-AriaNeural") */
  voiceName: string;
  /** Speech rate multiplier (0.5 to 2.0, default 1.0) */
  rate: number;
  /** Pitch adjustment in percentage (-50 to +50, default 0) */
  pitch: number;
  /** Audio output format */
  outputFormat: TTSOutputFormat;
}

/**
 * Default TTS settings.
 */
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  voiceName: '', // Empty means auto-detect from locale
  rate: 1.0,
  pitch: 0,
  outputFormat: 'Audio24Khz48KBitRateMonoMp3',
};

/**
 * Constraints for TTS settings values.
 */
export const TTS_CONSTRAINTS = {
  rate: { min: 0.5, max: 2.0, step: 0.1 },
  pitch: { min: -50, max: 50, step: 5 },
} as const;

/**
 * Request body for the TTS API endpoint.
 */
export interface TTSRequest {
  /** Text to convert to speech */
  text: string;
  /** Override voice name */
  voiceName?: string;
  /** Override speech rate */
  rate?: number;
  /** Override pitch adjustment */
  pitch?: number;
  /** Override output format */
  outputFormat?: TTSOutputFormat;
}
