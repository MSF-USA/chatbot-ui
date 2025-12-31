/**
 * Azure Speech Services TTS Voice Catalog
 *
 * Organized by locale with helper functions for voice selection.
 * Voice data sourced from: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
 */
import {
  BaseLanguageInfo,
  TTSSettings,
  VoiceGender,
  VoiceInfo,
  VoiceType,
} from '@/types/tts';

/**
 * Language metadata for UI display.
 */
export interface LanguageInfo {
  /** Locale code (e.g., "en-US") */
  locale: string;
  /** Display name in English */
  displayName: string;
  /** Native name (autonym) */
  nativeName: string;
}

/**
 * Available languages with TTS support.
 * Ordered alphabetically by display name.
 */
export const TTS_LANGUAGES: LanguageInfo[] = [
  {
    locale: 'ar-SA',
    displayName: 'Arabic (Saudi Arabia)',
    nativeName: 'العربية',
  },
  { locale: 'ar-EG', displayName: 'Arabic (Egypt)', nativeName: 'العربية' },
  { locale: 'bn-IN', displayName: 'Bengali (India)', nativeName: 'বাংলা' },
  { locale: 'zh-CN', displayName: 'Chinese (Mandarin)', nativeName: '中文' },
  { locale: 'zh-TW', displayName: 'Chinese (Taiwanese)', nativeName: '中文' },
  { locale: 'zh-HK', displayName: 'Chinese (Cantonese)', nativeName: '廣東話' },
  { locale: 'cs-CZ', displayName: 'Czech', nativeName: 'Čeština' },
  { locale: 'da-DK', displayName: 'Danish', nativeName: 'Dansk' },
  {
    locale: 'nl-NL',
    displayName: 'Dutch (Netherlands)',
    nativeName: 'Nederlands',
  },
  {
    locale: 'en-AU',
    displayName: 'English (Australia)',
    nativeName: 'English',
  },
  { locale: 'en-CA', displayName: 'English (Canada)', nativeName: 'English' },
  { locale: 'en-IN', displayName: 'English (India)', nativeName: 'English' },
  { locale: 'en-IE', displayName: 'English (Ireland)', nativeName: 'English' },
  { locale: 'en-GB', displayName: 'English (UK)', nativeName: 'English' },
  { locale: 'en-US', displayName: 'English (US)', nativeName: 'English' },
  { locale: 'fi-FI', displayName: 'Finnish', nativeName: 'Suomi' },
  { locale: 'fr-CA', displayName: 'French (Canada)', nativeName: 'Français' },
  { locale: 'fr-FR', displayName: 'French (France)', nativeName: 'Français' },
  { locale: 'de-AT', displayName: 'German (Austria)', nativeName: 'Deutsch' },
  { locale: 'de-DE', displayName: 'German (Germany)', nativeName: 'Deutsch' },
  {
    locale: 'de-CH',
    displayName: 'German (Switzerland)',
    nativeName: 'Deutsch',
  },
  { locale: 'el-GR', displayName: 'Greek', nativeName: 'Ελληνικά' },
  { locale: 'he-IL', displayName: 'Hebrew', nativeName: 'עברית' },
  { locale: 'hi-IN', displayName: 'Hindi', nativeName: 'हिन्दी' },
  { locale: 'hu-HU', displayName: 'Hungarian', nativeName: 'Magyar' },
  {
    locale: 'id-ID',
    displayName: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
  },
  { locale: 'it-IT', displayName: 'Italian', nativeName: 'Italiano' },
  { locale: 'ja-JP', displayName: 'Japanese', nativeName: '日本語' },
  { locale: 'ko-KR', displayName: 'Korean', nativeName: '한국어' },
  { locale: 'ms-MY', displayName: 'Malay', nativeName: 'Bahasa Melayu' },
  { locale: 'nb-NO', displayName: 'Norwegian', nativeName: 'Norsk' },
  { locale: 'pl-PL', displayName: 'Polish', nativeName: 'Polski' },
  {
    locale: 'pt-BR',
    displayName: 'Portuguese (Brazil)',
    nativeName: 'Português',
  },
  {
    locale: 'pt-PT',
    displayName: 'Portuguese (Portugal)',
    nativeName: 'Português',
  },
  { locale: 'ro-RO', displayName: 'Romanian', nativeName: 'Română' },
  { locale: 'ru-RU', displayName: 'Russian', nativeName: 'Русский' },
  { locale: 'sk-SK', displayName: 'Slovak', nativeName: 'Slovenčina' },
  {
    locale: 'es-AR',
    displayName: 'Spanish (Argentina)',
    nativeName: 'Español',
  },
  { locale: 'es-MX', displayName: 'Spanish (Mexico)', nativeName: 'Español' },
  { locale: 'es-ES', displayName: 'Spanish (Spain)', nativeName: 'Español' },
  { locale: 'es-US', displayName: 'Spanish (US)', nativeName: 'Español' },
  { locale: 'sv-SE', displayName: 'Swedish', nativeName: 'Svenska' },
  { locale: 'ta-IN', displayName: 'Tamil', nativeName: 'தமிழ்' },
  { locale: 'te-IN', displayName: 'Telugu', nativeName: 'తెలుగు' },
  { locale: 'th-TH', displayName: 'Thai', nativeName: 'ไทย' },
  { locale: 'tr-TR', displayName: 'Turkish', nativeName: 'Türkçe' },
  { locale: 'uk-UA', displayName: 'Ukrainian', nativeName: 'Українська' },
  { locale: 'vi-VN', displayName: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

/**
 * Helper to create a VoiceInfo object.
 */
function voice(
  name: string,
  displayName: string,
  gender: VoiceGender,
  type: VoiceType,
  locale: string,
): VoiceInfo {
  return { name, displayName, gender, type, locale };
}

/**
 * Complete voice catalog organized by locale.
 * Each locale contains an array of available voices.
 */
export const TTS_VOICES: Record<string, VoiceInfo[]> = {
  // Arabic (Saudi Arabia)
  'ar-SA': [
    voice('ar-SA-HamedNeural', 'Hamed', 'Male', 'Neural', 'ar-SA'),
    voice('ar-SA-ZariyahNeural', 'Zariyah', 'Female', 'Neural', 'ar-SA'),
  ],

  // Arabic (Egypt)
  'ar-EG': [
    voice('ar-EG-SalmaNeural', 'Salma', 'Female', 'Neural', 'ar-EG'),
    voice('ar-EG-ShakirNeural', 'Shakir', 'Male', 'Neural', 'ar-EG'),
  ],

  // Bengali (India)
  'bn-IN': [
    voice('bn-IN-BashkarNeural', 'Bashkar', 'Male', 'Neural', 'bn-IN'),
    voice('bn-IN-TanishaaNeural', 'Tanishaa', 'Female', 'Neural', 'bn-IN'),
  ],

  // Chinese (Mandarin)
  'zh-CN': [
    voice('zh-CN-XiaoxiaoNeural', 'Xiaoxiao', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-YunxiNeural', 'Yunxi', 'Male', 'Neural', 'zh-CN'),
    voice('zh-CN-YunjianNeural', 'Yunjian', 'Male', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaoyiNeural', 'Xiaoyi', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-YunyangNeural', 'Yunyang', 'Male', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaochenNeural', 'Xiaochen', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaohanNeural', 'Xiaohan', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaomengNeural', 'Xiaomeng', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaomoNeural', 'Xiaomo', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaoruiNeural', 'Xiaorui', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaoshuangNeural', 'Xiaoshuang', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaoxuanNeural', 'Xiaoxuan', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaoyanNeural', 'Xiaoyan', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-XiaozhenNeural', 'Xiaozhen', 'Female', 'Neural', 'zh-CN'),
    voice('zh-CN-YunfengNeural', 'Yunfeng', 'Male', 'Neural', 'zh-CN'),
    voice('zh-CN-YunhaoNeural', 'Yunhao', 'Male', 'Neural', 'zh-CN'),
    voice('zh-CN-YunzeNeural', 'Yunze', 'Male', 'Neural', 'zh-CN'),
    voice(
      'zh-CN-XiaoxiaoMultilingualNeural',
      'Xiaoxiao (Multilingual)',
      'Female',
      'Multilingual',
      'zh-CN',
    ),
  ],

  // Chinese (Taiwanese)
  'zh-TW': [
    voice('zh-TW-HsiaoChenNeural', 'HsiaoChen', 'Female', 'Neural', 'zh-TW'),
    voice('zh-TW-YunJheNeural', 'YunJhe', 'Male', 'Neural', 'zh-TW'),
    voice('zh-TW-HsiaoYuNeural', 'HsiaoYu', 'Female', 'Neural', 'zh-TW'),
  ],

  // Chinese (Cantonese)
  'zh-HK': [
    voice('zh-HK-HiuMaanNeural', 'HiuMaan', 'Female', 'Neural', 'zh-HK'),
    voice('zh-HK-WanLungNeural', 'WanLung', 'Male', 'Neural', 'zh-HK'),
    voice('zh-HK-HiuGaaiNeural', 'HiuGaai', 'Female', 'Neural', 'zh-HK'),
  ],

  // Czech
  'cs-CZ': [
    voice('cs-CZ-AntoninNeural', 'Antonin', 'Male', 'Neural', 'cs-CZ'),
    voice('cs-CZ-VlastaNeural', 'Vlasta', 'Female', 'Neural', 'cs-CZ'),
  ],

  // Danish
  'da-DK': [
    voice('da-DK-ChristelNeural', 'Christel', 'Female', 'Neural', 'da-DK'),
    voice('da-DK-JeppeNeural', 'Jeppe', 'Male', 'Neural', 'da-DK'),
  ],

  // Dutch (Netherlands)
  'nl-NL': [
    voice('nl-NL-ColetteNeural', 'Colette', 'Female', 'Neural', 'nl-NL'),
    voice('nl-NL-MaartenNeural', 'Maarten', 'Male', 'Neural', 'nl-NL'),
    voice('nl-NL-FennaNeural', 'Fenna', 'Female', 'Neural', 'nl-NL'),
  ],

  // English (Australia)
  'en-AU': [
    voice('en-AU-NatashaNeural', 'Natasha', 'Female', 'Neural', 'en-AU'),
    voice('en-AU-WilliamNeural', 'William', 'Male', 'Neural', 'en-AU'),
    voice('en-AU-AnnetteNeural', 'Annette', 'Female', 'Neural', 'en-AU'),
    voice('en-AU-CarlyNeural', 'Carly', 'Female', 'Neural', 'en-AU'),
    voice('en-AU-DarrenNeural', 'Darren', 'Male', 'Neural', 'en-AU'),
    voice('en-AU-DuncanNeural', 'Duncan', 'Male', 'Neural', 'en-AU'),
    voice('en-AU-ElsieNeural', 'Elsie', 'Female', 'Neural', 'en-AU'),
    voice('en-AU-FreyaNeural', 'Freya', 'Female', 'Neural', 'en-AU'),
    voice('en-AU-JoanneNeural', 'Joanne', 'Female', 'Neural', 'en-AU'),
    voice('en-AU-KenNeural', 'Ken', 'Male', 'Neural', 'en-AU'),
    voice('en-AU-KimNeural', 'Kim', 'Female', 'Neural', 'en-AU'),
    voice('en-AU-NeilNeural', 'Neil', 'Male', 'Neural', 'en-AU'),
    voice('en-AU-TimNeural', 'Tim', 'Male', 'Neural', 'en-AU'),
    voice('en-AU-TinaNeural', 'Tina', 'Female', 'Neural', 'en-AU'),
  ],

  // English (Canada)
  'en-CA': [
    voice('en-CA-ClaraNeural', 'Clara', 'Female', 'Neural', 'en-CA'),
    voice('en-CA-LiamNeural', 'Liam', 'Male', 'Neural', 'en-CA'),
  ],

  // English (India)
  'en-IN': [
    voice('en-IN-NeerjaNeural', 'Neerja', 'Female', 'Neural', 'en-IN'),
    voice('en-IN-PrabhatNeural', 'Prabhat', 'Male', 'Neural', 'en-IN'),
  ],

  // English (Ireland)
  'en-IE': [
    voice('en-IE-EmilyNeural', 'Emily', 'Female', 'Neural', 'en-IE'),
    voice('en-IE-ConnorNeural', 'Connor', 'Male', 'Neural', 'en-IE'),
  ],

  // English (UK)
  'en-GB': [
    voice('en-GB-SoniaNeural', 'Sonia', 'Female', 'Neural', 'en-GB'),
    voice('en-GB-RyanNeural', 'Ryan', 'Male', 'Neural', 'en-GB'),
    voice('en-GB-LibbyNeural', 'Libby', 'Female', 'Neural', 'en-GB'),
    voice('en-GB-AbbiNeural', 'Abbi', 'Female', 'Neural', 'en-GB'),
    voice('en-GB-AlfieNeural', 'Alfie', 'Male', 'Neural', 'en-GB'),
    voice('en-GB-BellaNeural', 'Bella', 'Female', 'Neural', 'en-GB'),
    voice('en-GB-ElliotNeural', 'Elliot', 'Male', 'Neural', 'en-GB'),
    voice('en-GB-EthanNeural', 'Ethan', 'Male', 'Neural', 'en-GB'),
    voice('en-GB-HollieNeural', 'Hollie', 'Female', 'Neural', 'en-GB'),
    voice('en-GB-MaisieNeural', 'Maisie', 'Female', 'Neural', 'en-GB'),
    voice('en-GB-NoahNeural', 'Noah', 'Male', 'Neural', 'en-GB'),
    voice('en-GB-OliverNeural', 'Oliver', 'Male', 'Neural', 'en-GB'),
    voice('en-GB-OliviaNeural', 'Olivia', 'Female', 'Neural', 'en-GB'),
    voice('en-GB-ThomasNeural', 'Thomas', 'Male', 'Neural', 'en-GB'),
  ],

  // English (US)
  'en-US': [
    voice('en-US-AvaNeural', 'Ava', 'Female', 'Neural', 'en-US'),
    voice('en-US-AndrewNeural', 'Andrew', 'Male', 'Neural', 'en-US'),
    voice('en-US-EmmaNeural', 'Emma', 'Female', 'Neural', 'en-US'),
    voice('en-US-BrianNeural', 'Brian', 'Male', 'Neural', 'en-US'),
    voice('en-US-JennyNeural', 'Jenny', 'Female', 'Neural', 'en-US'),
    voice('en-US-GuyNeural', 'Guy', 'Male', 'Neural', 'en-US'),
    voice('en-US-AriaNeural', 'Aria', 'Female', 'Neural', 'en-US'),
    voice('en-US-DavisNeural', 'Davis', 'Male', 'Neural', 'en-US'),
    voice('en-US-JaneNeural', 'Jane', 'Female', 'Neural', 'en-US'),
    voice('en-US-JasonNeural', 'Jason', 'Male', 'Neural', 'en-US'),
    voice('en-US-SaraNeural', 'Sara', 'Female', 'Neural', 'en-US'),
    voice('en-US-TonyNeural', 'Tony', 'Male', 'Neural', 'en-US'),
    voice('en-US-NancyNeural', 'Nancy', 'Female', 'Neural', 'en-US'),
    voice('en-US-AmberNeural', 'Amber', 'Female', 'Neural', 'en-US'),
    voice('en-US-AnaNeural', 'Ana', 'Female', 'Neural', 'en-US'),
    voice('en-US-AshleyNeural', 'Ashley', 'Female', 'Neural', 'en-US'),
    voice('en-US-BrandonNeural', 'Brandon', 'Male', 'Neural', 'en-US'),
    voice('en-US-ChristopherNeural', 'Christopher', 'Male', 'Neural', 'en-US'),
    voice('en-US-CoraNeural', 'Cora', 'Female', 'Neural', 'en-US'),
    voice('en-US-ElizabethNeural', 'Elizabeth', 'Female', 'Neural', 'en-US'),
    voice('en-US-EricNeural', 'Eric', 'Male', 'Neural', 'en-US'),
    voice('en-US-JacobNeural', 'Jacob', 'Male', 'Neural', 'en-US'),
    voice('en-US-MichelleNeural', 'Michelle', 'Female', 'Neural', 'en-US'),
    voice('en-US-MonicaNeural', 'Monica', 'Female', 'Neural', 'en-US'),
    voice('en-US-RogerNeural', 'Roger', 'Male', 'Neural', 'en-US'),
    voice('en-US-SteffanNeural', 'Steffan', 'Male', 'Neural', 'en-US'),
    voice(
      'en-US-AvaMultilingualNeural',
      'Ava (Multilingual)',
      'Female',
      'Multilingual',
      'en-US',
    ),
    voice(
      'en-US-AndrewMultilingualNeural',
      'Andrew (Multilingual)',
      'Male',
      'Multilingual',
      'en-US',
    ),
    voice(
      'en-US-EmmaMultilingualNeural',
      'Emma (Multilingual)',
      'Female',
      'Multilingual',
      'en-US',
    ),
    voice(
      'en-US-BrianMultilingualNeural',
      'Brian (Multilingual)',
      'Male',
      'Multilingual',
      'en-US',
    ),
  ],

  // Finnish
  'fi-FI': [
    voice('fi-FI-SelmaNeural', 'Selma', 'Female', 'Neural', 'fi-FI'),
    voice('fi-FI-HarriNeural', 'Harri', 'Male', 'Neural', 'fi-FI'),
    voice('fi-FI-NooraNeural', 'Noora', 'Female', 'Neural', 'fi-FI'),
  ],

  // French (Canada)
  'fr-CA': [
    voice('fr-CA-SylvieNeural', 'Sylvie', 'Female', 'Neural', 'fr-CA'),
    voice('fr-CA-JeanNeural', 'Jean', 'Male', 'Neural', 'fr-CA'),
    voice('fr-CA-AntoineNeural', 'Antoine', 'Male', 'Neural', 'fr-CA'),
    voice('fr-CA-ThierryNeural', 'Thierry', 'Male', 'Neural', 'fr-CA'),
  ],

  // French (France)
  'fr-FR': [
    voice('fr-FR-DeniseNeural', 'Denise', 'Female', 'Neural', 'fr-FR'),
    voice('fr-FR-HenriNeural', 'Henri', 'Male', 'Neural', 'fr-FR'),
    voice('fr-FR-AlainNeural', 'Alain', 'Male', 'Neural', 'fr-FR'),
    voice('fr-FR-BrigitteNeural', 'Brigitte', 'Female', 'Neural', 'fr-FR'),
    voice('fr-FR-CelesteNeural', 'Celeste', 'Female', 'Neural', 'fr-FR'),
    voice('fr-FR-ClaudeNeural', 'Claude', 'Male', 'Neural', 'fr-FR'),
    voice('fr-FR-CoralieNeural', 'Coralie', 'Female', 'Neural', 'fr-FR'),
    voice('fr-FR-EloiseNeural', 'Eloise', 'Female', 'Neural', 'fr-FR'),
    voice('fr-FR-JacquelineNeural', 'Jacqueline', 'Female', 'Neural', 'fr-FR'),
    voice('fr-FR-JeromeNeural', 'Jerome', 'Male', 'Neural', 'fr-FR'),
    voice('fr-FR-JosephineNeural', 'Josephine', 'Female', 'Neural', 'fr-FR'),
    voice('fr-FR-MauriceNeural', 'Maurice', 'Male', 'Neural', 'fr-FR'),
    voice('fr-FR-YvesNeural', 'Yves', 'Male', 'Neural', 'fr-FR'),
    voice('fr-FR-YvetteNeural', 'Yvette', 'Female', 'Neural', 'fr-FR'),
    voice(
      'fr-FR-VivienneMultilingualNeural',
      'Vivienne (Multilingual)',
      'Female',
      'Multilingual',
      'fr-FR',
    ),
    voice(
      'fr-FR-RemyMultilingualNeural',
      'Remy (Multilingual)',
      'Male',
      'Multilingual',
      'fr-FR',
    ),
  ],

  // German (Austria)
  'de-AT': [
    voice('de-AT-IngridNeural', 'Ingrid', 'Female', 'Neural', 'de-AT'),
    voice('de-AT-JonasNeural', 'Jonas', 'Male', 'Neural', 'de-AT'),
  ],

  // German (Germany)
  'de-DE': [
    voice('de-DE-KatjaNeural', 'Katja', 'Female', 'Neural', 'de-DE'),
    voice('de-DE-ConradNeural', 'Conrad', 'Male', 'Neural', 'de-DE'),
    voice('de-DE-AmalaNeural', 'Amala', 'Female', 'Neural', 'de-DE'),
    voice('de-DE-BerndNeural', 'Bernd', 'Male', 'Neural', 'de-DE'),
    voice('de-DE-ChristophNeural', 'Christoph', 'Male', 'Neural', 'de-DE'),
    voice('de-DE-ElkeNeural', 'Elke', 'Female', 'Neural', 'de-DE'),
    voice('de-DE-GiselaNeural', 'Gisela', 'Female', 'Neural', 'de-DE'),
    voice('de-DE-KasperNeural', 'Kasper', 'Male', 'Neural', 'de-DE'),
    voice('de-DE-KillianNeural', 'Killian', 'Male', 'Neural', 'de-DE'),
    voice('de-DE-KlarissaNeural', 'Klarissa', 'Female', 'Neural', 'de-DE'),
    voice('de-DE-KlausNeural', 'Klaus', 'Male', 'Neural', 'de-DE'),
    voice('de-DE-LouisaNeural', 'Louisa', 'Female', 'Neural', 'de-DE'),
    voice('de-DE-MajaNeural', 'Maja', 'Female', 'Neural', 'de-DE'),
    voice('de-DE-RalfNeural', 'Ralf', 'Male', 'Neural', 'de-DE'),
    voice('de-DE-TanjaNeural', 'Tanja', 'Female', 'Neural', 'de-DE'),
    voice(
      'de-DE-FlorianMultilingualNeural',
      'Florian (Multilingual)',
      'Male',
      'Multilingual',
      'de-DE',
    ),
    voice(
      'de-DE-SeraphinaMultilingualNeural',
      'Seraphina (Multilingual)',
      'Female',
      'Multilingual',
      'de-DE',
    ),
  ],

  // German (Switzerland)
  'de-CH': [
    voice('de-CH-LeniNeural', 'Leni', 'Female', 'Neural', 'de-CH'),
    voice('de-CH-JanNeural', 'Jan', 'Male', 'Neural', 'de-CH'),
  ],

  // Greek
  'el-GR': [
    voice('el-GR-AthinaNeural', 'Athina', 'Female', 'Neural', 'el-GR'),
    voice('el-GR-NestorasNeural', 'Nestoras', 'Male', 'Neural', 'el-GR'),
  ],

  // Hebrew
  'he-IL': [
    voice('he-IL-HilaNeural', 'Hila', 'Female', 'Neural', 'he-IL'),
    voice('he-IL-AvriNeural', 'Avri', 'Male', 'Neural', 'he-IL'),
  ],

  // Hindi
  'hi-IN': [
    voice('hi-IN-SwaraNeural', 'Swara', 'Female', 'Neural', 'hi-IN'),
    voice('hi-IN-MadhurNeural', 'Madhur', 'Male', 'Neural', 'hi-IN'),
  ],

  // Hungarian
  'hu-HU': [
    voice('hu-HU-NoemiNeural', 'Noemi', 'Female', 'Neural', 'hu-HU'),
    voice('hu-HU-TamasNeural', 'Tamas', 'Male', 'Neural', 'hu-HU'),
  ],

  // Indonesian
  'id-ID': [
    voice('id-ID-GadisNeural', 'Gadis', 'Female', 'Neural', 'id-ID'),
    voice('id-ID-ArdiNeural', 'Ardi', 'Male', 'Neural', 'id-ID'),
  ],

  // Italian
  'it-IT': [
    voice('it-IT-ElsaNeural', 'Elsa', 'Female', 'Neural', 'it-IT'),
    voice('it-IT-DiegoNeural', 'Diego', 'Male', 'Neural', 'it-IT'),
    voice('it-IT-IsabellaNeural', 'Isabella', 'Female', 'Neural', 'it-IT'),
    voice('it-IT-BenignoNeural', 'Benigno', 'Male', 'Neural', 'it-IT'),
    voice('it-IT-CalimeroNeural', 'Calimero', 'Male', 'Neural', 'it-IT'),
    voice('it-IT-CataldoNeural', 'Cataldo', 'Male', 'Neural', 'it-IT'),
    voice('it-IT-FabiolaNeural', 'Fabiola', 'Female', 'Neural', 'it-IT'),
    voice('it-IT-FiammaNeural', 'Fiamma', 'Female', 'Neural', 'it-IT'),
    voice('it-IT-GianniNeural', 'Gianni', 'Male', 'Neural', 'it-IT'),
    voice('it-IT-ImeldaNeural', 'Imelda', 'Female', 'Neural', 'it-IT'),
    voice('it-IT-IrmaNeural', 'Irma', 'Female', 'Neural', 'it-IT'),
    voice('it-IT-LisandroNeural', 'Lisandro', 'Male', 'Neural', 'it-IT'),
    voice('it-IT-PalmiraNeural', 'Palmira', 'Female', 'Neural', 'it-IT'),
    voice('it-IT-PierinaNeural', 'Pierina', 'Female', 'Neural', 'it-IT'),
    voice('it-IT-RinaldoNeural', 'Rinaldo', 'Male', 'Neural', 'it-IT'),
    voice(
      'it-IT-GiuseppeMultilingualNeural',
      'Giuseppe (Multilingual)',
      'Male',
      'Multilingual',
      'it-IT',
    ),
  ],

  // Japanese
  'ja-JP': [
    voice('ja-JP-NanamiNeural', 'Nanami', 'Female', 'Neural', 'ja-JP'),
    voice('ja-JP-KeitaNeural', 'Keita', 'Male', 'Neural', 'ja-JP'),
    voice('ja-JP-AoiNeural', 'Aoi', 'Female', 'Neural', 'ja-JP'),
    voice('ja-JP-DaichiNeural', 'Daichi', 'Male', 'Neural', 'ja-JP'),
    voice('ja-JP-MayuNeural', 'Mayu', 'Female', 'Neural', 'ja-JP'),
    voice('ja-JP-NaokiNeural', 'Naoki', 'Male', 'Neural', 'ja-JP'),
    voice('ja-JP-ShioriNeural', 'Shiori', 'Female', 'Neural', 'ja-JP'),
    voice(
      'ja-JP-MasaruMultilingualNeural',
      'Masaru (Multilingual)',
      'Male',
      'Multilingual',
      'ja-JP',
    ),
  ],

  // Korean
  'ko-KR': [
    voice('ko-KR-SunHiNeural', 'SunHi', 'Female', 'Neural', 'ko-KR'),
    voice('ko-KR-InJoonNeural', 'InJoon', 'Male', 'Neural', 'ko-KR'),
    voice('ko-KR-BongJinNeural', 'BongJin', 'Male', 'Neural', 'ko-KR'),
    voice('ko-KR-GookMinNeural', 'GookMin', 'Male', 'Neural', 'ko-KR'),
    voice('ko-KR-JiMinNeural', 'JiMin', 'Female', 'Neural', 'ko-KR'),
    voice('ko-KR-SeoHyeonNeural', 'SeoHyeon', 'Female', 'Neural', 'ko-KR'),
    voice('ko-KR-SoonBokNeural', 'SoonBok', 'Female', 'Neural', 'ko-KR'),
    voice('ko-KR-YuJinNeural', 'YuJin', 'Female', 'Neural', 'ko-KR'),
    voice(
      'ko-KR-HyunsuMultilingualNeural',
      'Hyunsu (Multilingual)',
      'Male',
      'Multilingual',
      'ko-KR',
    ),
  ],

  // Malay
  'ms-MY': [
    voice('ms-MY-YasminNeural', 'Yasmin', 'Female', 'Neural', 'ms-MY'),
    voice('ms-MY-OsmanNeural', 'Osman', 'Male', 'Neural', 'ms-MY'),
  ],

  // Norwegian
  'nb-NO': [
    voice('nb-NO-PernilleNeural', 'Pernille', 'Female', 'Neural', 'nb-NO'),
    voice('nb-NO-FinnNeural', 'Finn', 'Male', 'Neural', 'nb-NO'),
    voice('nb-NO-IselinNeural', 'Iselin', 'Female', 'Neural', 'nb-NO'),
  ],

  // Polish
  'pl-PL': [
    voice('pl-PL-AgnieszkaNeural', 'Agnieszka', 'Female', 'Neural', 'pl-PL'),
    voice('pl-PL-MarekNeural', 'Marek', 'Male', 'Neural', 'pl-PL'),
    voice('pl-PL-ZofiaNeural', 'Zofia', 'Female', 'Neural', 'pl-PL'),
  ],

  // Portuguese (Brazil)
  'pt-BR': [
    voice('pt-BR-FranciscaNeural', 'Francisca', 'Female', 'Neural', 'pt-BR'),
    voice('pt-BR-AntonioNeural', 'Antonio', 'Male', 'Neural', 'pt-BR'),
    voice('pt-BR-BrendaNeural', 'Brenda', 'Female', 'Neural', 'pt-BR'),
    voice('pt-BR-DonatoNeural', 'Donato', 'Male', 'Neural', 'pt-BR'),
    voice('pt-BR-ElzaNeural', 'Elza', 'Female', 'Neural', 'pt-BR'),
    voice('pt-BR-FabioNeural', 'Fabio', 'Male', 'Neural', 'pt-BR'),
    voice('pt-BR-GiovannaNeural', 'Giovanna', 'Female', 'Neural', 'pt-BR'),
    voice('pt-BR-HumbertoNeural', 'Humberto', 'Male', 'Neural', 'pt-BR'),
    voice('pt-BR-JulioNeural', 'Julio', 'Male', 'Neural', 'pt-BR'),
    voice('pt-BR-LeilaNeural', 'Leila', 'Female', 'Neural', 'pt-BR'),
    voice('pt-BR-LeticiaNeural', 'Leticia', 'Female', 'Neural', 'pt-BR'),
    voice('pt-BR-ManuelaNeural', 'Manuela', 'Female', 'Neural', 'pt-BR'),
    voice('pt-BR-NicolauNeural', 'Nicolau', 'Male', 'Neural', 'pt-BR'),
    voice('pt-BR-ValerioNeural', 'Valerio', 'Male', 'Neural', 'pt-BR'),
    voice('pt-BR-YaraNeural', 'Yara', 'Female', 'Neural', 'pt-BR'),
    voice(
      'pt-BR-ThalitaMultilingualNeural',
      'Thalita (Multilingual)',
      'Female',
      'Multilingual',
      'pt-BR',
    ),
  ],

  // Portuguese (Portugal)
  'pt-PT': [
    voice('pt-PT-RaquelNeural', 'Raquel', 'Female', 'Neural', 'pt-PT'),
    voice('pt-PT-DuarteNeural', 'Duarte', 'Male', 'Neural', 'pt-PT'),
    voice('pt-PT-FernandaNeural', 'Fernanda', 'Female', 'Neural', 'pt-PT'),
  ],

  // Romanian
  'ro-RO': [
    voice('ro-RO-AlinaNeural', 'Alina', 'Female', 'Neural', 'ro-RO'),
    voice('ro-RO-EmilNeural', 'Emil', 'Male', 'Neural', 'ro-RO'),
  ],

  // Russian
  'ru-RU': [
    voice('ru-RU-SvetlanaNeural', 'Svetlana', 'Female', 'Neural', 'ru-RU'),
    voice('ru-RU-DmitryNeural', 'Dmitry', 'Male', 'Neural', 'ru-RU'),
    voice('ru-RU-DariyaNeural', 'Dariya', 'Female', 'Neural', 'ru-RU'),
  ],

  // Slovak
  'sk-SK': [
    voice('sk-SK-ViktoriaNeural', 'Viktoria', 'Female', 'Neural', 'sk-SK'),
    voice('sk-SK-LukasNeural', 'Lukas', 'Male', 'Neural', 'sk-SK'),
  ],

  // Spanish (Argentina)
  'es-AR': [
    voice('es-AR-ElenaNeural', 'Elena', 'Female', 'Neural', 'es-AR'),
    voice('es-AR-TomasNeural', 'Tomas', 'Male', 'Neural', 'es-AR'),
  ],

  // Spanish (Mexico)
  'es-MX': [
    voice('es-MX-DaliaNeural', 'Dalia', 'Female', 'Neural', 'es-MX'),
    voice('es-MX-JorgeNeural', 'Jorge', 'Male', 'Neural', 'es-MX'),
    voice('es-MX-BeatrizNeural', 'Beatriz', 'Female', 'Neural', 'es-MX'),
    voice('es-MX-CandelaNeural', 'Candela', 'Female', 'Neural', 'es-MX'),
    voice('es-MX-CarlotaNeural', 'Carlota', 'Female', 'Neural', 'es-MX'),
    voice('es-MX-CecilioNeural', 'Cecilio', 'Male', 'Neural', 'es-MX'),
    voice('es-MX-GerardoNeural', 'Gerardo', 'Male', 'Neural', 'es-MX'),
    voice('es-MX-LarissaNeural', 'Larissa', 'Female', 'Neural', 'es-MX'),
    voice('es-MX-LibertoNeural', 'Liberto', 'Male', 'Neural', 'es-MX'),
    voice('es-MX-LucianoNeural', 'Luciano', 'Male', 'Neural', 'es-MX'),
    voice('es-MX-MarinaNeural', 'Marina', 'Female', 'Neural', 'es-MX'),
    voice('es-MX-NuriaNeural', 'Nuria', 'Female', 'Neural', 'es-MX'),
    voice('es-MX-PelayoNeural', 'Pelayo', 'Male', 'Neural', 'es-MX'),
    voice('es-MX-RenataNeural', 'Renata', 'Female', 'Neural', 'es-MX'),
    voice('es-MX-YagoNeural', 'Yago', 'Male', 'Neural', 'es-MX'),
  ],

  // Spanish (Spain)
  'es-ES': [
    voice('es-ES-ElviraNeural', 'Elvira', 'Female', 'Neural', 'es-ES'),
    voice('es-ES-AlvaroNeural', 'Alvaro', 'Male', 'Neural', 'es-ES'),
    voice('es-ES-AbrilNeural', 'Abril', 'Female', 'Neural', 'es-ES'),
    voice('es-ES-ArnauNeural', 'Arnau', 'Male', 'Neural', 'es-ES'),
    voice('es-ES-DarioNeural', 'Dario', 'Male', 'Neural', 'es-ES'),
    voice('es-ES-EliasNeural', 'Elias', 'Male', 'Neural', 'es-ES'),
    voice('es-ES-EstrellaNeural', 'Estrella', 'Female', 'Neural', 'es-ES'),
    voice('es-ES-IreneNeural', 'Irene', 'Female', 'Neural', 'es-ES'),
    voice('es-ES-LaiaNeural', 'Laia', 'Female', 'Neural', 'es-ES'),
    voice('es-ES-LiaNeural', 'Lia', 'Female', 'Neural', 'es-ES'),
    voice('es-ES-NilNeural', 'Nil', 'Male', 'Neural', 'es-ES'),
    voice('es-ES-SaulNeural', 'Saul', 'Male', 'Neural', 'es-ES'),
    voice('es-ES-TeoNeural', 'Teo', 'Male', 'Neural', 'es-ES'),
    voice('es-ES-TrianaNeural', 'Triana', 'Female', 'Neural', 'es-ES'),
    voice('es-ES-VeraNeural', 'Vera', 'Female', 'Neural', 'es-ES'),
    voice(
      'es-ES-XimenaMultilingualNeural',
      'Ximena (Multilingual)',
      'Female',
      'Multilingual',
      'es-ES',
    ),
    voice(
      'es-ES-IsidoraMultilingualNeural',
      'Isidora (Multilingual)',
      'Female',
      'Multilingual',
      'es-ES',
    ),
  ],

  // Spanish (US)
  'es-US': [
    voice('es-US-PalomaNeural', 'Paloma', 'Female', 'Neural', 'es-US'),
    voice('es-US-AlonsoNeural', 'Alonso', 'Male', 'Neural', 'es-US'),
  ],

  // Swedish
  'sv-SE': [
    voice('sv-SE-SofieNeural', 'Sofie', 'Female', 'Neural', 'sv-SE'),
    voice('sv-SE-MattiasNeural', 'Mattias', 'Male', 'Neural', 'sv-SE'),
    voice('sv-SE-HilleviNeural', 'Hillevi', 'Female', 'Neural', 'sv-SE'),
  ],

  // Tamil
  'ta-IN': [
    voice('ta-IN-PallaviNeural', 'Pallavi', 'Female', 'Neural', 'ta-IN'),
    voice('ta-IN-ValluvarNeural', 'Valluvar', 'Male', 'Neural', 'ta-IN'),
  ],

  // Telugu
  'te-IN': [
    voice('te-IN-ShrutiNeural', 'Shruti', 'Female', 'Neural', 'te-IN'),
    voice('te-IN-MohanNeural', 'Mohan', 'Male', 'Neural', 'te-IN'),
  ],

  // Thai
  'th-TH': [
    voice('th-TH-PremwadeeNeural', 'Premwadee', 'Female', 'Neural', 'th-TH'),
    voice('th-TH-NiwatNeural', 'Niwat', 'Male', 'Neural', 'th-TH'),
    voice('th-TH-AcharaNeural', 'Achara', 'Female', 'Neural', 'th-TH'),
  ],

  // Turkish
  'tr-TR': [
    voice('tr-TR-EmelNeural', 'Emel', 'Female', 'Neural', 'tr-TR'),
    voice('tr-TR-AhmetNeural', 'Ahmet', 'Male', 'Neural', 'tr-TR'),
  ],

  // Ukrainian
  'uk-UA': [
    voice('uk-UA-PolinaNeural', 'Polina', 'Female', 'Neural', 'uk-UA'),
    voice('uk-UA-OstapNeural', 'Ostap', 'Male', 'Neural', 'uk-UA'),
  ],

  // Vietnamese
  'vi-VN': [
    voice('vi-VN-HoaiMyNeural', 'HoaiMy', 'Female', 'Neural', 'vi-VN'),
    voice('vi-VN-NamMinhNeural', 'NamMinh', 'Male', 'Neural', 'vi-VN'),
  ],
};

/**
 * Get all available voices for a specific locale.
 *
 * @param locale - The locale code (e.g., "en-US")
 * @returns Array of VoiceInfo for the locale, or empty array if not found
 */
export function getVoicesForLocale(locale: string): VoiceInfo[] {
  return TTS_VOICES[locale] ?? [];
}

/**
 * Get the default voice for a specific locale.
 * Returns the first female Neural voice, or the first available voice.
 *
 * @param locale - The locale code (e.g., "en-US")
 * @returns The default VoiceInfo for the locale, or undefined if no voices available
 */
export function getDefaultVoiceForLocale(
  locale: string,
): VoiceInfo | undefined {
  const voices = getVoicesForLocale(locale);
  if (voices.length === 0) return undefined;

  // Prefer first female Neural voice
  const femaleNeural = voices.find(
    (v) => v.gender === 'Female' && v.type === 'Neural',
  );
  if (femaleNeural) return femaleNeural;

  // Fall back to first available voice
  return voices[0];
}

/**
 * Get a voice by its full name.
 *
 * @param voiceName - The full voice name (e.g., "en-US-AriaNeural")
 * @returns The VoiceInfo, or undefined if not found
 */
export function getVoiceByName(voiceName: string): VoiceInfo | undefined {
  // Extract locale from voice name (e.g., "en-US" from "en-US-AriaNeural")
  const localeParts = voiceName.match(/^([a-z]{2}-[A-Z]{2})/);
  if (!localeParts) return undefined;

  const locale = localeParts[1];
  const voices = getVoicesForLocale(locale);
  return voices.find((v) => v.name === voiceName);
}

/**
 * Get all available locales that have TTS voices.
 *
 * @returns Array of locale codes
 */
export function getAvailableLocales(): string[] {
  return Object.keys(TTS_VOICES);
}

/**
 * Get language info for a locale.
 *
 * @param locale - The locale code
 * @returns LanguageInfo or undefined if not found
 */
export function getLanguageInfo(locale: string): LanguageInfo | undefined {
  return TTS_LANGUAGES.find((lang) => lang.locale === locale);
}

/**
 * Maps app locales to TTS locales.
 * Some app locales may not have direct TTS equivalents.
 */
export const APP_TO_TTS_LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  ru: 'ru-RU',
  nl: 'nl-NL',
  pl: 'pl-PL',
  tr: 'tr-TR',
  vi: 'vi-VN',
  th: 'th-TH',
  id: 'id-ID',
  cs: 'cs-CZ',
  da: 'da-DK',
  fi: 'fi-FI',
  el: 'el-GR',
  he: 'he-IL',
  hi: 'hi-IN',
  hu: 'hu-HU',
  nb: 'nb-NO',
  ro: 'ro-RO',
  sk: 'sk-SK',
  sv: 'sv-SE',
  uk: 'uk-UA',
  bn: 'bn-IN',
  ms: 'ms-MY',
  ta: 'ta-IN',
  te: 'te-IN',
};

/**
 * Get the best TTS locale for an app locale.
 *
 * @param appLocale - The app locale (e.g., "en", "es")
 * @returns The best matching TTS locale, or "en-US" as fallback
 */
export function getTTSLocaleForAppLocale(appLocale: string): string {
  // Direct mapping
  if (APP_TO_TTS_LOCALE_MAP[appLocale]) {
    return APP_TO_TTS_LOCALE_MAP[appLocale];
  }

  // Check if the appLocale is already a full TTS locale
  if (TTS_VOICES[appLocale]) {
    return appLocale;
  }

  // Try to find a TTS locale that starts with the app locale
  const matchingLocale = Object.keys(TTS_VOICES).find((loc) =>
    loc.toLowerCase().startsWith(appLocale.toLowerCase()),
  );

  return matchingLocale ?? 'en-US';
}

/**
 * Base languages available for TTS (without country variants).
 * Used for the language dropdown in the UI.
 */
export const TTS_BASE_LANGUAGES: BaseLanguageInfo[] = [
  { code: 'ar', displayName: 'Arabic', nativeName: 'العربية' },
  { code: 'bn', displayName: 'Bengali', nativeName: 'বাংলা' },
  { code: 'cs', displayName: 'Czech', nativeName: 'Čeština' },
  { code: 'da', displayName: 'Danish', nativeName: 'Dansk' },
  { code: 'de', displayName: 'German', nativeName: 'Deutsch' },
  { code: 'el', displayName: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'en', displayName: 'English', nativeName: 'English' },
  { code: 'es', displayName: 'Spanish', nativeName: 'Español' },
  { code: 'fi', displayName: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', displayName: 'French', nativeName: 'Français' },
  { code: 'he', displayName: 'Hebrew', nativeName: 'עברית' },
  { code: 'hi', displayName: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hu', displayName: 'Hungarian', nativeName: 'Magyar' },
  { code: 'id', displayName: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', displayName: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', displayName: 'Japanese', nativeName: '日本語' },
  { code: 'ko', displayName: 'Korean', nativeName: '한국어' },
  { code: 'ms', displayName: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'nb', displayName: 'Norwegian', nativeName: 'Norsk' },
  { code: 'nl', displayName: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', displayName: 'Polish', nativeName: 'Polski' },
  { code: 'pt', displayName: 'Portuguese', nativeName: 'Português' },
  { code: 'ro', displayName: 'Romanian', nativeName: 'Română' },
  { code: 'ru', displayName: 'Russian', nativeName: 'Русский' },
  { code: 'sk', displayName: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sv', displayName: 'Swedish', nativeName: 'Svenska' },
  { code: 'ta', displayName: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', displayName: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', displayName: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', displayName: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', displayName: 'Ukrainian', nativeName: 'Українська' },
  { code: 'vi', displayName: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'zh', displayName: 'Chinese', nativeName: '中文' },
];

/**
 * Region display names for voice list UI.
 */
export const REGION_DISPLAY_NAMES: Record<string, string> = {
  US: 'US',
  GB: 'UK',
  AU: 'AU',
  CA: 'CA',
  IN: 'IN',
  IE: 'IE',
  SA: 'SA',
  EG: 'EG',
  CN: 'CN',
  TW: 'TW',
  HK: 'HK',
  CZ: 'CZ',
  DK: 'DK',
  NL: 'NL',
  FI: 'FI',
  FR: 'FR',
  AT: 'AT',
  DE: 'DE',
  CH: 'CH',
  GR: 'GR',
  IL: 'IL',
  HU: 'HU',
  ID: 'ID',
  IT: 'IT',
  JP: 'JP',
  KR: 'KR',
  MY: 'MY',
  NO: 'NO',
  PL: 'PL',
  BR: 'BR',
  PT: 'PT',
  RO: 'RO',
  RU: 'RU',
  SK: 'SK',
  AR: 'AR',
  MX: 'MX',
  ES: 'ES',
  SE: 'SE',
  TH: 'TH',
  TR: 'TR',
  UA: 'UA',
  VN: 'VN',
};

/**
 * All multilingual voices extracted from the catalog.
 * These voices can speak multiple languages and should appear in every language dropdown.
 */
export const MULTILINGUAL_VOICES: VoiceInfo[] = Object.values(TTS_VOICES)
  .flat()
  .filter((v) => v.type === 'Multilingual');

/**
 * Sample preview text for each language.
 * Used for TTS voice preview in settings.
 */
export const TTS_PREVIEW_SAMPLES: Record<string, string> = {
  ar: 'مرحباً! هذه معاينة لإعدادات الصوت.',
  bn: 'হ্যালো! এটি ভয়েস সেটিংসের একটি পূর্বরূপ।',
  cs: 'Ahoj! Toto je náhled nastavení hlasu.',
  da: 'Hej! Dette er en forhåndsvisning af stemmeindstillingerne.',
  de: 'Hallo! Dies ist eine Vorschau der Spracheinstellungen.',
  el: 'Γεια! Αυτή είναι μια προεπισκόπηση των ρυθμίσεων φωνής.',
  en: 'Hello! This is a preview of the voice settings.',
  es: '¡Hola! Esta es una vista previa de la configuración de voz.',
  fi: 'Hei! Tämä on esikatselu ääniasetuksista.',
  fr: 'Bonjour ! Ceci est un aperçu des paramètres de voix.',
  he: 'שלום! זוהי תצוגה מקדימה של הגדרות הקול.',
  hi: 'नमस्ते! यह आवाज सेटिंग्स का पूर्वावलोकन है।',
  hu: 'Helló! Ez a hangbeállítások előnézete.',
  id: 'Halo! Ini adalah pratinjau pengaturan suara.',
  it: "Ciao! Questa è un'anteprima delle impostazioni vocali.",
  ja: 'こんにちは！これは音声設定のプレビューです。',
  ko: '안녕하세요! 음성 설정 미리보기입니다.',
  ms: 'Hai! Ini adalah pratonton tetapan suara.',
  nb: 'Hei! Dette er en forhåndsvisning av stemmeinnstillingene.',
  nl: 'Hallo! Dit is een voorbeeld van de steminstellingen.',
  pl: 'Cześć! To jest podgląd ustawień głosu.',
  pt: 'Olá! Esta é uma prévia das configurações de voz.',
  ro: 'Bună! Aceasta este o previzualizare a setărilor vocale.',
  ru: 'Привет! Это предварительный просмотр настроек голоса.',
  sk: 'Ahoj! Toto je náhľad nastavení hlasu.',
  sv: 'Hej! Detta är en förhandsgranskning av röstinställningarna.',
  ta: 'வணக்கம்! இது குரல் அமைப்புகளின் முன்னோட்டம்.',
  te: 'హలో! ఇది వాయిస్ సెట్టింగ్‌ల ప్రివ్యూ.',
  th: 'สวัสดี! นี่คือตัวอย่างการตั้งค่าเสียง',
  tr: 'Merhaba! Bu, ses ayarlarının bir önizlemesidir.',
  uk: 'Привіт! Це попередній перегляд налаштувань голосу.',
  vi: 'Xin chào! Đây là bản xem trước cài đặt giọng nói.',
  zh: '你好！这是语音设置的预览。',
};

/**
 * Extract base language code from a locale.
 *
 * @param locale - The locale code (e.g., "en-US")
 * @returns The base language code (e.g., "en")
 */
export function getBaseLanguageCode(locale: string): string {
  return locale.split('-')[0].toLowerCase();
}

/**
 * Extract region code from a locale.
 *
 * @param locale - The locale code (e.g., "en-US")
 * @returns The region code (e.g., "US"), or empty string if none
 */
export function getRegionCode(locale: string): string {
  const parts = locale.split('-');
  return parts.length > 1 ? parts[1].toUpperCase() : '';
}

/**
 * Get all voices for a base language (aggregates all regional variants).
 *
 * @param languageCode - The base language code (e.g., "en")
 * @returns Array of all VoiceInfo for that language across all regions
 */
export function getVoicesForLanguage(languageCode: string): VoiceInfo[] {
  const lowerCode = languageCode.toLowerCase();
  const voices: VoiceInfo[] = [];

  for (const [locale, localeVoices] of Object.entries(TTS_VOICES)) {
    if (getBaseLanguageCode(locale) === lowerCode) {
      // Only include non-multilingual voices (multilingual are handled separately)
      voices.push(...localeVoices.filter((v) => v.type !== 'Multilingual'));
    }
  }

  return voices;
}

/**
 * Get voices for a language, separated into multilingual and language-specific.
 *
 * @param languageCode - The base language code (e.g., "en")
 * @returns Object with multilingualVoices and languageVoices arrays
 */
export function getVoicesForLanguageWithMultilingual(languageCode: string): {
  multilingualVoices: VoiceInfo[];
  languageVoices: VoiceInfo[];
} {
  return {
    multilingualVoices: MULTILINGUAL_VOICES,
    languageVoices: getVoicesForLanguage(languageCode),
  };
}

/**
 * Resolve the best voice for a detected language using the settings hierarchy.
 * Priority: 1) Language-specific default, 2) Global voice, 3) System default
 *
 * @param detectedLanguage - The detected language code (e.g., "en", "fr")
 * @param settings - The user's TTS settings
 * @returns The voice name to use
 */
export function resolveVoiceForLanguage(
  detectedLanguage: string,
  settings: TTSSettings,
): string {
  const langCode = detectedLanguage.toLowerCase();

  // 1. Check for language-specific default
  if (settings.languageVoices?.[langCode]) {
    return settings.languageVoices[langCode];
  }

  // 2. Use global voice (should be multilingual for best results)
  if (settings.globalVoice) {
    return settings.globalVoice;
  }

  // 3. Fall back to system default for the language
  const ttsLocale = getTTSLocaleForAppLocale(langCode);
  const defaultVoice = getDefaultVoiceForLocale(ttsLocale);
  return defaultVoice?.name ?? 'en-US-AvaMultilingualNeural';
}

/**
 * Get preview sample text for a language.
 *
 * @param languageCode - The base language code (e.g., "en", "fr")
 * @returns The preview sample text for that language
 */
export function getPreviewSampleForLanguage(languageCode: string): string {
  const lowerCode = languageCode.toLowerCase();
  return TTS_PREVIEW_SAMPLES[lowerCode] ?? TTS_PREVIEW_SAMPLES['en'];
}

/**
 * Get base language info by code.
 *
 * @param code - The base language code (e.g., "en")
 * @returns BaseLanguageInfo or undefined if not found
 */
export function getBaseLanguageInfo(
  code: string,
): BaseLanguageInfo | undefined {
  return TTS_BASE_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === code.toLowerCase(),
  );
}
