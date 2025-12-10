/**
 * Translation feature type definitions
 */

/**
 * A single cached translation entry
 */
export interface TranslationCacheEntry {
  /** ISO 639-1 locale code */
  locale: string;
  /** The translated text content */
  translatedText: string;
  /** Optional notes about the translation (idioms, context, etc.) */
  notes?: string;
  /** Timestamp when the translation was cached */
  cachedAt: number;
}

/**
 * Translation state for a single message component
 */
export interface MessageTranslationState {
  /** Currently displayed locale (null = showing original) */
  currentLocale: string | null;
  /** Whether a translation request is in progress */
  isTranslating: boolean;
  /** Cached translations keyed by locale code */
  translations: Record<string, TranslationCacheEntry>;
  /** Error message if the last translation failed */
  error: string | null;
}

/**
 * Request body for the translation API
 */
export interface TranslationRequest {
  /** The text to translate */
  sourceText: string;
  /** Target language ISO 639-1 code */
  targetLocale: string;
}

/**
 * Response data from the translation API
 */
export interface TranslationResponseData {
  /** The translated text */
  translatedText: string;
  /** Optional notes about translation difficulties or adaptations */
  notes?: string;
}
