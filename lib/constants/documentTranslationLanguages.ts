/**
 * Document Translation Languages Configuration
 *
 * Full list of languages supported by Azure Translator Document Translation.
 * Source: https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support
 *
 * Note: Only languages that support both source and target translation are included
 * for the best user experience in document translation.
 */

/**
 * Represents a language supported by document translation.
 */
export interface DocumentTranslationLanguage {
  /** ISO language code (e.g., 'en', 'es', 'zh-Hans') */
  code: string;

  /** English name of the language */
  englishName: string;

  /** Native name (autonym) of the language */
  nativeName: string;
}

/**
 * Languages that support bidirectional document translation (both as source and target).
 * Sorted alphabetically by English name.
 */
export const DOCUMENT_TRANSLATION_LANGUAGES: DocumentTranslationLanguage[] = [
  { code: 'af', englishName: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'sq', englishName: 'Albanian', nativeName: 'Shqip' },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية' },
  { code: 'az', englishName: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'ba', englishName: 'Bashkir', nativeName: 'Башҡорт' },
  { code: 'eu', englishName: 'Basque', nativeName: 'Euskara' },
  { code: 'bs', englishName: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'bg', englishName: 'Bulgarian', nativeName: 'Български' },
  { code: 'yue', englishName: 'Cantonese (Traditional)', nativeName: '粵語' },
  { code: 'ca', englishName: 'Catalan', nativeName: 'Català' },
  { code: 'lzh', englishName: 'Chinese (Literary)', nativeName: '文言文' },
  {
    code: 'zh-Hans',
    englishName: 'Chinese (Simplified)',
    nativeName: '简体中文',
  },
  {
    code: 'zh-Hant',
    englishName: 'Chinese (Traditional)',
    nativeName: '繁體中文',
  },
  { code: 'hr', englishName: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'cs', englishName: 'Czech', nativeName: 'Čeština' },
  { code: 'da', englishName: 'Danish', nativeName: 'Dansk' },
  { code: 'nl', englishName: 'Dutch', nativeName: 'Nederlands' },
  { code: 'en', englishName: 'English', nativeName: 'English' },
  { code: 'et', englishName: 'Estonian', nativeName: 'Eesti' },
  { code: 'fo', englishName: 'Faroese', nativeName: 'Føroyskt' },
  { code: 'fj', englishName: 'Fijian', nativeName: 'Vosa Vakaviti' },
  { code: 'fil', englishName: 'Filipino', nativeName: 'Filipino' },
  { code: 'fi', englishName: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', englishName: 'French', nativeName: 'Français' },
  {
    code: 'fr-ca',
    englishName: 'French (Canada)',
    nativeName: 'Français (Canada)',
  },
  { code: 'gl', englishName: 'Galician', nativeName: 'Galego' },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch' },
  { code: 'ht', englishName: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mww', englishName: 'Hmong Daw', nativeName: 'Hmoob Daw' },
  { code: 'hu', englishName: 'Hungarian', nativeName: 'Magyar' },
  { code: 'is', englishName: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'id', englishName: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ia', englishName: 'Interlingua', nativeName: 'Interlingua' },
  { code: 'ikt', englishName: 'Inuinnaqtun', nativeName: 'Inuinnaqtun' },
  {
    code: 'iu-Latn',
    englishName: 'Inuktitut (Latin)',
    nativeName: 'Inuktitut',
  },
  { code: 'ga', englishName: 'Irish', nativeName: 'Gaeilge' },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語' },
  { code: 'kn', englishName: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'kk', englishName: 'Kazakh', nativeName: 'Қазақ' },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어' },
  { code: 'ku-latn', englishName: 'Kurdish (Latin)', nativeName: 'Kurdî' },
  { code: 'ky', englishName: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'lv', englishName: 'Latvian', nativeName: 'Latviešu' },
  { code: 'lt', englishName: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'mk', englishName: 'Macedonian', nativeName: 'Македонски' },
  { code: 'mg', englishName: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'ms', englishName: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ml', englishName: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mt', englishName: 'Maltese', nativeName: 'Malti' },
  { code: 'mi', englishName: 'Maori', nativeName: 'Te Reo Māori' },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी' },
  { code: 'mn-Cyrl', englishName: 'Mongolian', nativeName: 'Монгол' },
  { code: 'ne', englishName: 'Nepali', nativeName: 'नेपाली' },
  { code: 'nb', englishName: 'Norwegian', nativeName: 'Norsk Bokmål' },
  { code: 'pl', englishName: 'Polish', nativeName: 'Polski' },
  {
    code: 'pt',
    englishName: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
  },
  {
    code: 'pt-pt',
    englishName: 'Portuguese (Portugal)',
    nativeName: 'Português (Portugal)',
  },
  { code: 'pa', englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'otq', englishName: 'Queretaro Otomi', nativeName: 'Hñähñu' },
  { code: 'ro', englishName: 'Romanian', nativeName: 'Română' },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский' },
  { code: 'sm', englishName: 'Samoan', nativeName: 'Gagana Sāmoa' },
  { code: 'sr-Cyrl', englishName: 'Serbian (Cyrillic)', nativeName: 'Српски' },
  { code: 'sr-Latn', englishName: 'Serbian (Latin)', nativeName: 'Srpski' },
  { code: 'sk', englishName: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', englishName: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'so', englishName: 'Somali', nativeName: 'Soomaali' },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español' },
  { code: 'sw', englishName: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'sv', englishName: 'Swedish', nativeName: 'Svenska' },
  { code: 'ty', englishName: 'Tahitian', nativeName: 'Reo Tahiti' },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'tt', englishName: 'Tatar', nativeName: 'Татар' },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'to', englishName: 'Tongan', nativeName: 'Lea Fakatonga' },
  { code: 'tr', englishName: 'Turkish', nativeName: 'Türkçe' },
  { code: 'tk', englishName: 'Turkmen', nativeName: 'Türkmen' },
  { code: 'uk', englishName: 'Ukrainian', nativeName: 'Українська' },
  { code: 'hsb', englishName: 'Upper Sorbian', nativeName: 'Hornjoserbšćina' },
  { code: 'uz', englishName: 'Uzbek', nativeName: "O'zbek" },
  { code: 'vi', englishName: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'cy', englishName: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'yua', englishName: 'Yucatec Maya', nativeName: "Màaya T'àan" },
  { code: 'zu', englishName: 'Zulu', nativeName: 'isiZulu' },
];

/**
 * Looks up a language by its code.
 *
 * @param code - The language code to look up
 * @returns The language object or undefined if not found
 */
export function getDocumentTranslationLanguageByCode(
  code: string,
): DocumentTranslationLanguage | undefined {
  return DOCUMENT_TRANSLATION_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === code.toLowerCase(),
  );
}

/**
 * Gets the localized name of a language using the browser's Intl.DisplayNames API.
 * Falls back to empty string if the API is unavailable or the code is invalid.
 *
 * @param code - The ISO language code
 * @param locale - The locale to display the language name in
 * @returns The localized language name or empty string
 */
export function getLocalizedLanguageName(code: string, locale: string): string {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
    return displayNames.of(code) || '';
  } catch {
    return '';
  }
}

/**
 * Searches languages by name (English, native, localized, or ISO code).
 *
 * @param query - Search query string
 * @param locale - Optional locale for searching by localized language names
 * @returns Array of matching languages
 */
export function searchDocumentTranslationLanguages(
  query: string,
  locale?: string,
): DocumentTranslationLanguage[] {
  const lowerQuery = query.toLowerCase();
  return DOCUMENT_TRANSLATION_LANGUAGES.filter((lang) => {
    // Check English name, native name, and ISO code
    if (
      lang.englishName.toLowerCase().includes(lowerQuery) ||
      lang.nativeName.toLowerCase().includes(lowerQuery) ||
      lang.code.toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    // Check localized name if locale is provided
    if (locale) {
      const localizedName = getLocalizedLanguageName(lang.code, locale);
      if (localizedName && localizedName.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Gets the display name for a language (native name with English fallback).
 *
 * @param code - The language code
 * @returns Display name string
 */
export function getLanguageDisplayName(code: string): string {
  const lang = getDocumentTranslationLanguageByCode(code);
  if (!lang) return code;
  return lang.nativeName !== lang.englishName
    ? `${lang.nativeName} (${lang.englishName})`
    : lang.englishName;
}
