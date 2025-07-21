#!/usr/bin/env ts-node

/**
 * Translation validation script
 * Checks completeness and quality of agent translations across all locales
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// Simple validation logic embedded in script

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple completion percentage calculation
 */
function calculateCompletionPercentage(translations: Record<string, any>): number {
  const { total, translated } = countTranslations(translations);
  return total > 0 ? Math.round((translated / total) * 100) : 0;
}

/**
 * Count total and translated strings
 */
function countTranslations(obj: Record<string, any>, locale?: string): { total: number; translated: number } {
  let total = 0;
  let translated = 0;
  
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const result = countTranslations(value, locale);
      total += result.total;
      translated += result.translated;
    } else if (typeof value === 'string') {
      total++;
      // Count as translated if it doesn't have locale prefix marker
      if (!locale || !value.startsWith(`[${locale.toUpperCase()}]`)) {
        translated++;
      }
    }
  }
  
  return { total, translated };
}

// Supported locales
const SUPPORTED_LOCALES = [
  'am', 'ar', 'bn', 'ca', 'cs', 'de', 'en', 'es', 'fa', 'fi', 'fr', 'he', 'hi', 'id', 'it',
  'ja', 'ko', 'my', 'nl', 'pl', 'pt', 'ro', 'ru', 'sv', 'sw', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh'
];

/**
 * Load translation file for a specific locale
 */
function loadTranslationFile(locale: string): Record<string, any> | null {
  const filePath = path.join(__dirname, '..', 'public', 'locales', locale, 'agents.json');
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${locale}/agents.json:`, error);
    return null;
  }
}

/**
 * Check if a translation value needs professional attention
 */
function needsProfessionalTranslation(value: string, locale: string): boolean {
  if (typeof value !== 'string') return false;
  
  // Check for locale prefix markers (e.g., "[ES]", "[FR]")
  const localePrefix = `[${locale.toUpperCase()}]`;
  return value.startsWith(localePrefix);
}

/**
 * Count translations needing professional work
 */
function countProfessionalTranslationNeeds(
  obj: Record<string, any>,
  locale: string,
  prefix: string = ''
): { total: number; needsWork: number; examples: string[] } {
  let total = 0;
  let needsWork = 0;
  const examples: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      const result = countProfessionalTranslationNeeds(value, locale, currentKey);
      total += result.total;
      needsWork += result.needsWork;
      examples.push(...result.examples);
    } else if (typeof value === 'string') {
      total++;
      if (needsProfessionalTranslation(value, locale)) {
        needsWork++;
        if (examples.length < 5) { // Limit examples
          examples.push(`${currentKey}: "${value}"`);
        }
      }
    }
  }
  
  return { total, needsWork, examples };
}

/**
 * Validate translations for a specific locale
 */
function validateLocale(locale: string): {
  locale: string;
  exists: boolean;
  valid: boolean;
  completion: number;
  professionalWorkNeeded: number;
  totalStrings: number;
  examples: string[];
  errors: number;
  warnings: number;
} {
  const translations = loadTranslationFile(locale);
  
  if (!translations) {
    return {
      locale,
      exists: false,
      valid: false,
      completion: 0,
      professionalWorkNeeded: 0,
      totalStrings: 0,
      examples: [],
      errors: 1,
      warnings: 0
    };
  }
  
  // Calculate completion percentage using embedded logic
  const completion = calculateCompletionPercentage(translations);
  
  // Count professional translation needs
  const professionalCount = countProfessionalTranslationNeeds(translations, locale);
  
  // Simple validation - check if file is valid JSON and has required structure
  const hasRequiredStructure = translations.common && translations.webSearch && translations.codeInterpreter;
  const totalErrors = hasRequiredStructure ? 0 : 1;
  const totalWarnings = 0;
  
  return {
    locale,
    exists: true,
    valid: totalErrors === 0,
    completion,
    professionalWorkNeeded: professionalCount.needsWork,
    totalStrings: professionalCount.total,
    examples: professionalCount.examples,
    errors: totalErrors,
    warnings: totalWarnings
  };
}

/**
 * Generate summary report
 */
function generateSummaryReport(results: ReturnType<typeof validateLocale>[]): string {
  const existing = results.filter(r => r.exists);
  const missing = results.filter(r => !r.exists);
  const valid = existing.filter(r => r.valid);
  const invalid = existing.filter(r => !r.valid);
  
  const totalCompletion = existing.length > 0 
    ? Math.round(existing.reduce((sum, r) => sum + r.completion, 0) / existing.length)
    : 0;
  
  const totalProfessionalWork = existing.reduce((sum, r) => sum + r.professionalWorkNeeded, 0);
  const totalStrings = existing.reduce((sum, r) => sum + r.totalStrings, 0);
  
  const tierOneLocales = ['en', 'es', 'fr', 'de', 'ja', 'zh'];
  const tierOneResults = results.filter(r => tierOneLocales.includes(r.locale));
  const tierOneCompletion = tierOneResults.length > 0
    ? Math.round(tierOneResults.reduce((sum, r) => sum + r.completion, 0) / tierOneResults.length)
    : 0;
  
  let report = '\n=== AGENT TRANSLATIONS VALIDATION SUMMARY ===\n\n';
  
  report += `📊 Overall Statistics:\n`;
  report += `   Total Locales: ${results.length}\n`;
  report += `   Translation Files Exist: ${existing.length}/${results.length}\n`;
  report += `   Valid (No Errors): ${valid.length}/${existing.length}\n`;
  report += `   Average Completion: ${totalCompletion}%\n`;
  report += `   Professional Work Needed: ${totalProfessionalWork}/${totalStrings} strings\n\n`;
  
  report += `🎯 Tier 1 Languages (Priority):\n`;
  for (const locale of tierOneLocales) {
    const result = results.find(r => r.locale === locale);
    if (result && result.exists) {
      const status = result.valid ? '✅' : '❌';
      const workPct = Math.round((result.professionalWorkNeeded / result.totalStrings) * 100);
      report += `   ${status} ${locale.toUpperCase()}: ${result.completion}% complete, ${workPct}% needs professional work\n`;
    } else {
      report += `   ❌ ${locale.toUpperCase()}: Missing translation file\n`;
    }
  }
  report += `   Tier 1 Average: ${tierOneCompletion}%\n\n`;
  
  if (missing.length > 0) {
    report += `❌ Missing Translation Files:\n`;
    for (const result of missing) {
      report += `   - ${result.locale}\n`;
    }
    report += '\n';
  }
  
  if (invalid.length > 0) {
    report += `⚠️  Locales with Validation Errors:\n`;
    for (const result of invalid.slice(0, 10)) { // Limit to first 10
      report += `   - ${result.locale.toUpperCase()}: ${result.errors} errors, ${result.warnings} warnings\n`;
    }
    if (invalid.length > 10) {
      report += `   ... and ${invalid.length - 10} more\n`;
    }
    report += '\n';
  }
  
  // Show examples of what needs professional translation
  const highPriorityWork = existing
    .filter(r => tierOneLocales.includes(r.locale) && r.professionalWorkNeeded > 0)
    .slice(0, 3);
  
  if (highPriorityWork.length > 0) {
    report += `🔧 Professional Translation Examples (Tier 1 languages):\n`;
    for (const result of highPriorityWork) {
      report += `\n   ${result.locale.toUpperCase()} - ${result.professionalWorkNeeded} strings need work:\n`;
      for (const example of result.examples.slice(0, 3)) {
        report += `     ${example}\n`;
      }
    }
    report += '\n';
  }
  
  return report;
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🔍 Starting translation validation...\n');
  
  const results: ReturnType<typeof validateLocale>[] = [];
  
  // Validate each locale
  for (const locale of SUPPORTED_LOCALES) {
    console.log(`Validating ${locale}...`);
    const result = validateLocale(locale);
    results.push(result);
  }
  
  // Generate and display summary
  const summaryReport = generateSummaryReport(results);
  console.log(summaryReport);
  
  // Save detailed report to file
  const reportPath = path.join(__dirname, '..', 'translation-validation-report.txt');
  let detailedReport = summaryReport;
  
  // Add detailed validation for key locales
  const keyLocales = ['en', 'es', 'fr', 'de', 'ja'];
  detailedReport += '\n=== DETAILED LOCALE ANALYSIS ===\n';
  for (const locale of keyLocales) {
    const result = results.find(r => r.locale === locale);
    if (result && result.exists) {
      detailedReport += `\n${locale.toUpperCase()}:\n`;
      detailedReport += `  Completion: ${result.completion}%\n`;
      detailedReport += `  Professional work needed: ${result.professionalWorkNeeded}/${result.totalStrings}\n`;
      if (result.examples.length > 0) {
        detailedReport += `  Examples needing translation:\n`;
        for (const example of result.examples.slice(0, 5)) {
          detailedReport += `    ${example}\n`;
        }
      }
    }
  }
  
  fs.writeFileSync(reportPath, detailedReport, 'utf-8');
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  // Return appropriate exit code
  const hasErrors = results.some(r => !r.exists || !r.valid);
  if (hasErrors) {
    console.log('\n⚠️  Some validation issues found. Check the report for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All translations validated successfully!');
    process.exit(0);
  }
}

// Run the script
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});