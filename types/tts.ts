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
 * Per-language voice defaults mapped by base language code.
 * Example: { "en": "en-US-AriaNeural", "fr": "fr-FR-DeniseNeural" }
 */
export type LanguageVoiceDefaults = Record<string, string>;

/**
 * User-configurable TTS settings.
 */
export interface TTSSettings {
  /**
   * Global fallback voice (should be a multilingual voice).
   * Used when no language-specific default is set.
   */
  globalVoice: string;
  /**
   * Per-language voice defaults.
   * Keys are base language codes (e.g., "en", "fr").
   * Values are full voice names (e.g., "en-US-AriaNeural").
   */
  languageVoices: LanguageVoiceDefaults;
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
  globalVoice: 'en-US-AvaMultilingualNeural',
  languageVoices: {},
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
  /** Override voice name (if provided, skips language detection) */
  voiceName?: string;
  /** Pre-detected language hint (avoids server-side detection) */
  detectedLanguage?: string;
  /** Override speech rate */
  rate?: number;
  /** Override pitch adjustment */
  pitch?: number;
  /** Override output format */
  outputFormat?: TTSOutputFormat;
}

/**
 * Result from language detection service.
 */
export interface LanguageDetectionResult {
  /** ISO 639-1 language code (e.g., "en", "fr") */
  language: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Optional region hint (e.g., "US", "FR") */
  region?: string;
}

/**
 * Base language information for UI display.
 */
export interface BaseLanguageInfo {
  /** ISO 639-1 language code (e.g., "en", "fr") */
  code: string;
  /** English display name (e.g., "English", "French") */
  displayName: string;
  /** Native language name (e.g., "English", "Français") */
  nativeName: string;
}
