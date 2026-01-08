// Locale utility functions and mappings

/**
 * Map of ISO 639-1 language codes to their autonym (name in their own language)
 */
export const localeToAutonym: Record<string, string> = {
  am: 'አማርኛ',
  en: 'English',
  es: 'Español',
  ar: 'العربية',
  bn: 'বাংলা',
  ca: 'Català',
  cs: 'Čeština',
  de: 'Deutsch',
  fa: 'فارسی',
  fi: 'Suomi',
  fr: 'Français',
  he: 'עברית',
  hi: 'हिन्दी',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  my: 'မြန်မာဘာသာ',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
  ro: 'Română',
  ru: 'Русский',
  si: 'සිංහල',
  sv: 'Svenska',
  sw: 'Kiswahili',
  te: 'తెలుగు',
  th: 'ไทย',
  tr: 'Türkçe',
  uk: 'Українська',
  ur: 'اردو',
  vi: 'Tiếng Việt',
  zh: '中文',
};

/**
 * Get the autonym (native name) for a given locale
 * @param locale - ISO 639-1 language code
 * @returns The autonym for the locale, or the locale itself if not found
 */
export const getAutonym = (locale: string): string => {
  return localeToAutonym[locale] || locale;
};

/**
 * Get all supported locales
 * @returns Array of supported locale codes
 */
export const getSupportedLocales = (): string[] => {
  return Object.keys(localeToAutonym);
};

/**
 * Convert a model ID to a localization key
 * Model IDs contain characters (dots, dashes) that aren't valid in JSON keys,
 * so we convert them to underscores and lowercase.
 *
 * @param modelId - The model ID (e.g., 'gpt-4.1', 'DeepSeek-R1')
 * @returns A valid localization key (e.g., 'gpt_4_1', 'deepseek_r1')
 *
 * @example
 * modelIdToLocaleKey('gpt-4.1') // 'gpt_4_1'
 * modelIdToLocaleKey('DeepSeek-R1') // 'deepseek_r1'
 * modelIdToLocaleKey('claude-opus-4-5') // 'claude_opus_4_5'
 */
export const modelIdToLocaleKey = (modelId: string): string => {
  return modelId.toLowerCase().replace(/[.-]/g, '_');
};
