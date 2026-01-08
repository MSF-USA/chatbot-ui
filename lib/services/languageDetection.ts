/**
 * Language Detection Service
 *
 * Detects the language of text for TTS voice selection.
 * Uses pattern-based heuristics for common languages with fallback options.
 *
 * Can be upgraded to use Azure AI Language Text API for higher accuracy:
 * npm install @azure/ai-language-text
 */
import { LanguageDetectionResult } from '@/types/tts';

/**
 * Unicode range patterns for script-based detection.
 * These provide high confidence for languages with unique scripts.
 */
const SCRIPT_PATTERNS: { pattern: RegExp; language: string }[] = [
  // CJK Scripts
  { pattern: /[\u4e00-\u9fff]/, language: 'zh' }, // Chinese (CJK Unified)
  { pattern: /[\u3040-\u309f]/, language: 'ja' }, // Japanese Hiragana
  { pattern: /[\u30a0-\u30ff]/, language: 'ja' }, // Japanese Katakana
  { pattern: /[\uac00-\ud7af]/, language: 'ko' }, // Korean Hangul

  // Indic Scripts
  { pattern: /[\u0900-\u097f]/, language: 'hi' }, // Devanagari (Hindi)
  { pattern: /[\u0980-\u09ff]/, language: 'bn' }, // Bengali
  { pattern: /[\u0b80-\u0bff]/, language: 'ta' }, // Tamil
  { pattern: /[\u0c00-\u0c7f]/, language: 'te' }, // Telugu
  { pattern: /[\u0e00-\u0e7f]/, language: 'th' }, // Thai

  // Middle Eastern
  { pattern: /[\u0600-\u06ff]/, language: 'ar' }, // Arabic
  { pattern: /[\u0590-\u05ff]/, language: 'he' }, // Hebrew

  // Cyrillic
  { pattern: /[\u0400-\u04ff]/, language: 'ru' }, // Cyrillic (Russian default)

  // Greek
  { pattern: /[\u0370-\u03ff]/, language: 'el' }, // Greek
];

/**
 * Common words/patterns for Latin-script languages.
 * These are weighted by distinctiveness and frequency.
 */
const LATIN_PATTERNS: {
  patterns: RegExp[];
  language: string;
  weight: number;
}[] = [
  // German - distinctive patterns
  {
    patterns: [
      /\b(und|ist|der|die|das|nicht|ich|ein|eine|es|sie|wir|haben|werden|kann)\b/gi,
      /\b(für|über|unter|zwischen|durch|gegen|ohne|während)\b/gi,
      /(sch|ß|ü|ö|ä)/gi,
    ],
    language: 'de',
    weight: 1.5,
  },
  // French - distinctive patterns
  {
    patterns: [
      /\b(le|la|les|de|du|des|et|est|un|une|que|qui|dans|pour|sur|avec|ce|cette)\b/gi,
      /\b(je|tu|il|elle|nous|vous|ils|elles|ne|pas|plus)\b/gi,
      /(é|è|ê|ë|à|â|ô|û|î|ç|œ)/gi,
    ],
    language: 'fr',
    weight: 1.5,
  },
  // Spanish - distinctive patterns
  {
    patterns: [
      /\b(el|la|los|las|de|del|en|y|que|es|un|una|por|para|con|como)\b/gi,
      /\b(no|se|su|pero|más|este|esta|muy|también|yo|tú|él|ella)\b/gi,
      /(ñ|¡|¿|á|é|í|ó|ú)/gi,
    ],
    language: 'es',
    weight: 1.5,
  },
  // Italian - distinctive patterns
  {
    patterns: [
      /\b(il|la|lo|i|gli|le|di|da|in|con|che|non|per|sono|come)\b/gi,
      /\b(una|uno|del|della|dei|delle|questo|questa|quello|quella)\b/gi,
      /(à|è|ì|ò|ù)/gi,
    ],
    language: 'it',
    weight: 1.5,
  },
  // Portuguese - distinctive patterns
  {
    patterns: [
      /\b(o|a|os|as|de|do|da|dos|das|em|no|na|por|para|com|que|é|um|uma)\b/gi,
      /\b(não|se|seu|sua|mais|também|muito|este|esta|esse|essa)\b/gi,
      /(ã|õ|ç|á|é|í|ó|ú|â|ê|ô)/gi,
    ],
    language: 'pt',
    weight: 1.5,
  },
  // Dutch - distinctive patterns
  {
    patterns: [
      /\b(de|het|een|van|in|is|op|te|met|en|dat|voor|zijn|niet|aan)\b/gi,
      /\b(dit|die|ook|hij|zij|wij|maar|als|dan|naar|wat|kan|moet)\b/gi,
      /(ij|oe|ui|aa|ee|oo)/gi,
    ],
    language: 'nl',
    weight: 1.3,
  },
  // Polish - distinctive patterns
  {
    patterns: [
      /\b(i|w|na|do|z|że|to|nie|się|jest|co|jak|ale|po|za|od)\b/gi,
      /(ą|ć|ę|ł|ń|ó|ś|ź|ż)/gi,
    ],
    language: 'pl',
    weight: 1.5,
  },
  // Swedish - distinctive patterns
  {
    patterns: [
      /\b(och|i|att|det|som|en|på|är|av|för|med|den|till|har|de)\b/gi,
      /(å|ä|ö)/gi,
    ],
    language: 'sv',
    weight: 1.3,
  },
  // Norwegian - distinctive patterns
  {
    patterns: [
      /\b(og|i|det|er|som|en|på|av|for|med|til|har|de|ikke|vi)\b/gi,
      /(æ|ø|å)/gi,
    ],
    language: 'nb',
    weight: 1.3,
  },
  // Danish - distinctive patterns
  {
    patterns: [
      /\b(og|i|det|er|som|en|på|af|for|med|til|har|de|ikke|vi)\b/gi,
      /(æ|ø|å)/gi,
    ],
    language: 'da',
    weight: 1.2,
  },
  // Finnish - distinctive patterns
  {
    patterns: [
      /\b(ja|on|ei|että|se|kun|niin|jos|tai|mutta|ovat|voi|olla)\b/gi,
      /(ää|öö|yy|ii|uu)/gi,
    ],
    language: 'fi',
    weight: 1.4,
  },
  // Czech - distinctive patterns
  {
    patterns: [
      /\b(a|je|v|na|to|se|že|s|do|pro|za|jako|ale|nebo|být)\b/gi,
      /(á|é|í|ó|ú|ý|č|ď|ě|ň|ř|š|ť|ů|ž)/gi,
    ],
    language: 'cs',
    weight: 1.5,
  },
  // Romanian - distinctive patterns
  {
    patterns: [
      /\b(și|în|de|la|cu|pe|nu|ce|o|un|una|este|sunt|că|dar)\b/gi,
      /(ă|â|î|ș|ț)/gi,
    ],
    language: 'ro',
    weight: 1.5,
  },
  // Hungarian - distinctive patterns
  {
    patterns: [
      /\b(a|az|és|hogy|nem|ez|van|volt|meg|már|csak|de|vagy|mint|még)\b/gi,
      /(á|é|í|ó|ö|ő|ú|ü|ű)/gi,
    ],
    language: 'hu',
    weight: 1.4,
  },
  // Turkish - distinctive patterns
  {
    patterns: [
      /\b(ve|bir|bu|da|de|için|ile|ne|var|ama|gibi|daha|çok|olan)\b/gi,
      /(ı|İ|ğ|ş|ç|ö|ü)/gi,
    ],
    language: 'tr',
    weight: 1.5,
  },
  // Vietnamese - distinctive patterns
  {
    patterns: [
      /\b(và|của|là|có|trong|không|được|cho|với|này|đã|như|từ|những)\b/gi,
      /(ă|â|đ|ê|ô|ơ|ư|ả|ã|ạ|ấ|ầ|ẫ|ậ|ắ|ằ|ẵ|ặ|ẻ|ẽ|ẹ|ế|ề|ễ|ệ|ỉ|ĩ|ị|ỏ|õ|ọ|ố|ồ|ỗ|ộ|ớ|ờ|ỡ|ợ|ủ|ũ|ụ|ứ|ừ|ữ|ự|ỳ|ỷ|ỹ|ỵ)/gi,
    ],
    language: 'vi',
    weight: 2.0,
  },
  // Indonesian/Malay - distinctive patterns
  {
    patterns: [
      /\b(dan|yang|di|ini|itu|dengan|untuk|tidak|dari|ke|pada|adalah|ada)\b/gi,
      /\b(saya|anda|mereka|kita|akan|sudah|bisa|harus|dapat|juga|atau)\b/gi,
    ],
    language: 'id',
    weight: 1.2,
  },
  // English - last as fallback for Latin scripts
  {
    patterns: [
      /\b(the|a|an|is|are|was|were|be|been|being|have|has|had)\b/gi,
      /\b(do|does|did|will|would|could|should|may|might|must|shall)\b/gi,
      /\b(and|or|but|if|then|because|so|that|this|these|those|which|who|what|when|where|why|how)\b/gi,
    ],
    language: 'en',
    weight: 1.0,
  },
];

/**
 * Count matches for a set of patterns in text.
 */
function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Detect language using script-based patterns (for non-Latin scripts).
 */
function detectByScript(text: string): LanguageDetectionResult | null {
  for (const { pattern, language } of SCRIPT_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, 'g'));
    if (matches && matches.length >= 3) {
      // At least 3 characters to be confident
      return {
        language,
        confidence: Math.min(0.95, 0.7 + matches.length * 0.02),
      };
    }
  }
  return null;
}

/**
 * Detect language using word patterns (for Latin scripts).
 */
function detectByPatterns(text: string): LanguageDetectionResult {
  const scores: { language: string; score: number }[] = [];

  for (const { patterns, language, weight } of LATIN_PATTERNS) {
    const count = countMatches(text, patterns);
    if (count > 0) {
      scores.push({ language, score: count * weight });
    }
  }

  if (scores.length === 0) {
    return { language: 'en', confidence: 0.3 }; // Default to English with low confidence
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const topScore = scores[0];
  const secondScore = scores[1]?.score ?? 0;

  // Calculate confidence based on margin between top scores
  const margin = secondScore > 0 ? topScore.score / secondScore : 2;
  const confidence = Math.min(
    0.9,
    0.4 + Math.min(margin - 1, 1) * 0.4 + Math.min(topScore.score / 10, 0.2),
  );

  return {
    language: topScore.language,
    confidence,
  };
}

/**
 * Detect the language of the given text.
 *
 * This uses pattern-based heuristics for fast, offline detection.
 * For higher accuracy in production, consider using Azure AI Language Text API.
 *
 * @param text - The text to analyze
 * @returns Detection result with language code and confidence score
 */
export async function detectLanguage(
  text: string,
): Promise<LanguageDetectionResult> {
  // Handle empty or very short text
  if (!text || text.trim().length < 3) {
    return { language: 'en', confidence: 0.1 };
  }

  // Clean and prepare text
  const cleanText = text.trim();

  // First try script-based detection (high confidence for non-Latin scripts)
  const scriptResult = detectByScript(cleanText);
  if (scriptResult) {
    return scriptResult;
  }

  // For Latin scripts, use word pattern matching
  return detectByPatterns(cleanText);
}

/**
 * Check if a language is a CJK language (Chinese, Japanese, Korean).
 * These languages may need special handling for TTS.
 */
export function isCJKLanguage(languageCode: string): boolean {
  return ['zh', 'ja', 'ko'].includes(languageCode.toLowerCase());
}

/**
 * Check if a language uses right-to-left script.
 */
export function isRTLLanguage(languageCode: string): boolean {
  return ['ar', 'he'].includes(languageCode.toLowerCase());
}
