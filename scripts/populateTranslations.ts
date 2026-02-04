#!/usr/bin/env ts-node

/**
 * Mass translation file generation script
 * Creates agents.json for all supported locales based on the English template
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported locales from next-i18next.config.js
const SUPPORTED_LOCALES = [
  'am',
  'ar',
  'bn',
  'ca',
  'cs',
  'de',
  'en',
  'es',
  'fa',
  'fi',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'my',
  'nl',
  'pl',
  'pt',
  'ro',
  'ru',
  'sv',
  'sw',
  'te',
  'th',
  'tr',
  'uk',
  'ur',
  'vi',
  'zh',
];

/**
 * Base translations that can be auto-generated (technical terms, common words)
 * These provide a starting point for professional translators
 */
const AUTO_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Spanish translations
  es: {
    'Web Search': 'Búsqueda Web',
    'Code Interpreter': 'Intérprete de Código',
    'URL Analysis': 'Análisis de URL',
    'Knowledge Base': 'Base de Conocimiento',
    'Standard Chat': 'Chat Estándar',
    Foundry: 'Foundry',
    'Third Party': 'Terceros',
    'Agent Error': 'Error del Agente',
    'An unknown error occurred': 'Ocurrió un error desconocido',
    Retry: 'Reintentar',
    'Use fallback': 'Usar alternativa',
    'Processing time': 'Tiempo de procesamiento',
    Confidence: 'Confianza',
    'Tokens used': 'Tokens utilizados',
    'Agent results will be displayed here':
      'Los resultados del agente se mostrarán aquí',
    'Search Results': 'Resultados de Búsqueda',
    'No results found': 'No se encontraron resultados',
    'No search data available': 'No hay datos de búsqueda disponibles',
    results: 'resultados',
    Relevance: 'Relevancia',
    Source: 'Fuente',
    Citations: 'Citas',
    Cite: 'Citar',
    Open: 'Abrir',
    'Open link in new tab': 'Abrir enlace en nueva pestaña',
    Filters: 'Filtros',
    'Sort by': 'Ordenar por',
    'Filter by': 'Filtrar por',
    All: 'Todos',
    Date: 'Fecha',
    Title: 'Título',
    Query: 'Consulta',
    'Search time': 'Tiempo de búsqueda',
    Cached: 'En caché',
    'Loading...': 'Cargando...',
    'Searching...': 'Buscando...',
    'Processing...': 'Procesando...',
    'Analyzing...': 'Analizando...',
    Cancel: 'Cancelar',
    Configure: 'Configurar',
    Submit: 'Enviar',
    Priority: 'Prioridad',
    'Estimated time': 'Tiempo estimado',
    Availability: 'Disponibilidad',
    Configuration: 'Configuración',
    High: 'Alta',
    Medium: 'Media',
    Low: 'Baja',
  },

  // French translations
  fr: {
    'Web Search': 'Recherche Web',
    'Code Interpreter': 'Interpréteur de Code',
    'URL Analysis': "Analyse d'URL",
    'Knowledge Base': 'Base de Connaissances',
    'Standard Chat': 'Chat Standard',
    Foundry: 'Foundry',
    'Third Party': 'Tiers',
    'Agent Error': "Erreur d'Agent",
    'An unknown error occurred': "Une erreur inconnue s'est produite",
    Retry: 'Réessayer',
    'Use fallback': "Utiliser l'alternative",
    'Processing time': 'Temps de traitement',
    Confidence: 'Confiance',
    'Tokens used': 'Jetons utilisés',
    'Agent results will be displayed here':
      "Les résultats de l'agent s'afficheront ici",
    'Search Results': 'Résultats de Recherche',
    'No results found': 'Aucun résultat trouvé',
    'No search data available': 'Aucune donnée de recherche disponible',
    results: 'résultats',
    Relevance: 'Pertinence',
    Source: 'Source',
    Citations: 'Citations',
    Cite: 'Citer',
    Open: 'Ouvrir',
    'Open link in new tab': 'Ouvrir le lien dans un nouvel onglet',
    Filters: 'Filtres',
    'Sort by': 'Trier par',
    'Filter by': 'Filtrer par',
    All: 'Tous',
    Date: 'Date',
    Title: 'Titre',
    Query: 'Requête',
    'Search time': 'Temps de recherche',
    Cached: 'En cache',
    'Loading...': 'Chargement...',
    'Searching...': 'Recherche...',
    'Processing...': 'Traitement...',
    'Analyzing...': 'Analyse...',
    Cancel: 'Annuler',
    Configure: 'Configurer',
    Submit: 'Soumettre',
    Priority: 'Priorité',
    'Estimated time': 'Temps estimé',
    Availability: 'Disponibilité',
    Configuration: 'Configuration',
    High: 'Élevée',
    Medium: 'Moyenne',
    Low: 'Faible',
  },

  // German translations
  de: {
    'Web Search': 'Web-Suche',
    'Code Interpreter': 'Code-Interpreter',
    'URL Analysis': 'URL-Analyse',
    'Knowledge Base': 'Wissensbasis',
    'Standard Chat': 'Standard-Chat',
    Foundry: 'Foundry',
    'Third Party': 'Drittanbieter',
    'Agent Error': 'Agent-Fehler',
    'An unknown error occurred': 'Ein unbekannter Fehler ist aufgetreten',
    Retry: 'Wiederholen',
    'Use fallback': 'Fallback verwenden',
    'Processing time': 'Verarbeitungszeit',
    Confidence: 'Vertrauen',
    'Tokens used': 'Verwendete Token',
    'Agent results will be displayed here':
      'Agent-Ergebnisse werden hier angezeigt',
    'Search Results': 'Suchergebnisse',
    'No results found': 'Keine Ergebnisse gefunden',
    'No search data available': 'Keine Suchdaten verfügbar',
    results: 'Ergebnisse',
    Relevance: 'Relevanz',
    Source: 'Quelle',
    Citations: 'Zitate',
    Cite: 'Zitieren',
    Open: 'Öffnen',
    'Open link in new tab': 'Link in neuem Tab öffnen',
    Filters: 'Filter',
    'Sort by': 'Sortieren nach',
    'Filter by': 'Filtern nach',
    All: 'Alle',
    Date: 'Datum',
    Title: 'Titel',
    Query: 'Abfrage',
    'Search time': 'Suchzeit',
    Cached: 'Zwischengespeichert',
    'Loading...': 'Laden...',
    'Searching...': 'Suchen...',
    'Processing...': 'Verarbeiten...',
    'Analyzing...': 'Analysieren...',
    Cancel: 'Abbrechen',
    Configure: 'Konfigurieren',
    Submit: 'Absenden',
    Priority: 'Priorität',
    'Estimated time': 'Geschätzte Zeit',
    Availability: 'Verfügbarkeit',
    Configuration: 'Konfiguration',
    High: 'Hoch',
    Medium: 'Mittel',
    Low: 'Niedrig',
  },

  // Japanese translations
  ja: {
    'Web Search': 'ウェブ検索',
    'Code Interpreter': 'コードインタープリター',
    'URL Analysis': 'URL解析',
    'Knowledge Base': 'ナレッジベース',
    'Standard Chat': '標準チャット',
    Foundry: 'Foundry',
    'Third Party': 'サードパーティ',
    'Agent Error': 'エージェントエラー',
    'An unknown error occurred': '不明なエラーが発生しました',
    Retry: '再試行',
    'Use fallback': 'フォールバックを使用',
    'Processing time': '処理時間',
    Confidence: '信頼度',
    'Tokens used': '使用トークン',
    'Agent results will be displayed here':
      'エージェントの結果がここに表示されます',
    'Search Results': '検索結果',
    'No results found': '結果が見つかりません',
    'No search data available': '検索データがありません',
    results: '結果',
    Relevance: '関連性',
    Source: 'ソース',
    Citations: '引用',
    Cite: '引用する',
    Open: '開く',
    'Open link in new tab': '新しいタブでリンクを開く',
    Filters: 'フィルター',
    'Sort by': '並び替え',
    'Filter by': 'フィルター',
    All: 'すべて',
    Date: '日付',
    Title: 'タイトル',
    Query: 'クエリ',
    'Search time': '検索時間',
    Cached: 'キャッシュ済み',
    'Loading...': '読み込み中...',
    'Searching...': '検索中...',
    'Processing...': '処理中...',
    'Analyzing...': '分析中...',
    Cancel: 'キャンセル',
    Configure: '設定',
    Submit: '送信',
    Priority: '優先度',
    'Estimated time': '推定時間',
    Availability: '可用性',
    Configuration: '設定',
    High: '高',
    Medium: '中',
    Low: '低',
  },

  // Chinese Simplified translations
  'zh-CN': {
    'Web Search': '网络搜索',
    'Code Interpreter': '代码解释器',
    'URL Analysis': 'URL分析',
    'Knowledge Base': '知识库',
    'Standard Chat': '标准聊天',
    Foundry: 'Foundry',
    'Third Party': '第三方',
    'Agent Error': '代理错误',
    'An unknown error occurred': '发生未知错误',
    Retry: '重试',
    'Use fallback': '使用备用方案',
    'Processing time': '处理时间',
    Confidence: '置信度',
    'Tokens used': '使用的令牌',
    'Agent results will be displayed here': '代理结果将在此处显示',
    'Search Results': '搜索结果',
    'No results found': '未找到结果',
    'No search data available': '无搜索数据可用',
    results: '结果',
    Relevance: '相关性',
    Source: '来源',
    Citations: '引用',
    Cite: '引用',
    Open: '打开',
    'Open link in new tab': '在新标签页中打开链接',
    Filters: '筛选器',
    'Sort by': '排序方式',
    'Filter by': '筛选方式',
    All: '全部',
    Date: '日期',
    Title: '标题',
    Query: '查询',
    'Search time': '搜索时间',
    Cached: '已缓存',
    'Loading...': '加载中...',
    'Searching...': '搜索中...',
    'Processing...': '处理中...',
    'Analyzing...': '分析中...',
    Cancel: '取消',
    Configure: '配置',
    Submit: '提交',
    Priority: '优先级',
    'Estimated time': '预估时间',
    Availability: '可用性',
    Configuration: '配置',
    High: '高',
    Medium: '中',
    Low: '低',
  },
};

/**
 * Recursively translate an object structure
 */
function translateObject(
  obj: Record<string, any>,
  translations: Record<string, string>,
  locale: string,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = translateObject(value, translations, locale);
    } else if (typeof value === 'string') {
      // Try to find a translation, otherwise keep original or mark for translation
      const translation = translations[value];
      if (translation) {
        result[key] = translation;
      } else {
        // For languages without auto-translation, mark as needing translation
        if (locale === 'en') {
          result[key] = value;
        } else {
          result[key] = `[${locale.toUpperCase()}] ${value}`;
        }
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Generate agents.json for a specific locale
 */
function generateLocaleTranslations(
  locale: string,
  baseTranslations: Record<string, any>,
): void {
  const localeDir = path.join(__dirname, '..', 'public', 'locales', locale);
  const agentsFilePath = path.join(localeDir, 'agents.json');

  // Skip if file already exists and locale is English (master file)
  if (locale === 'en') {
    console.log(`Skipping ${locale} - master file already exists`);
    return;
  }

  // Create locale directory if it doesn't exist
  if (!fs.existsSync(localeDir)) {
    console.log(`Creating directory for locale: ${locale}`);
    fs.mkdirSync(localeDir, { recursive: true });
  }

  // Get translations for this locale or use default marker
  const localeTranslations = AUTO_TRANSLATIONS[locale] || {};

  // Generate translated structure
  const translatedStructure = translateObject(
    baseTranslations,
    localeTranslations,
    locale,
  );

  // Write the file
  fs.writeFileSync(
    agentsFilePath,
    JSON.stringify(translatedStructure, null, 2),
    'utf-8',
  );
  console.log(`Generated agents.json for locale: ${locale}`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🌍 Starting mass translation generation...\n');

  // Load the English base template
  const baseFilePath = path.join(
    __dirname,
    '..',
    'public',
    'locales',
    'en',
    'agents.json',
  );

  if (!fs.existsSync(baseFilePath)) {
    console.error('❌ English agents.json template not found!');
    console.error(
      'Please ensure the base English file exists at:',
      baseFilePath,
    );
    process.exit(1);
  }

  const baseTranslations = JSON.parse(fs.readFileSync(baseFilePath, 'utf-8'));
  console.log('✅ Loaded English base template');

  // Get all supported locales
  const supportedLocales = SUPPORTED_LOCALES;
  console.log(`📋 Found ${supportedLocales.length} supported locales`);

  // Track generation results
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  // Generate translations for each locale
  for (const locale of supportedLocales) {
    try {
      generateLocaleTranslations(locale, baseTranslations);
      if (locale === 'en') {
        skipped++;
      } else {
        generated++;
      }
    } catch (error) {
      console.error(`❌ Error generating translations for ${locale}:`, error);
      errors++;
    }
  }

  console.log('\n🎉 Translation generation complete!');
  console.log(`📊 Summary:`);
  console.log(`   Generated: ${generated} locales`);
  console.log(`   Skipped: ${skipped} locales`);
  console.log(`   Errors: ${errors} locales`);

  if (generated > 0) {
    console.log(
      '\n📝 Note: Generated files contain base translations and placeholders.',
    );
    console.log(
      '   Professional translators should review and refine these translations.',
    );
    console.log(
      '   Look for entries marked with [LOCALE] prefix for missing translations.',
    );
  }

  if (errors > 0) {
    console.log(
      '\n⚠️  Some locales failed to generate. Check the errors above.',
    );
    process.exit(1);
  }
}

// Handle locale mapping for specific cases
const LOCALE_MAPPING: Record<string, string> = {
  zh: 'zh-CN', // Map zh to zh-CN for Chinese translations
};

// Run the script
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

export { generateLocaleTranslations, translateObject };
