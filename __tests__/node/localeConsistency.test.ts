import * as fs from 'fs';
import * as path from 'path';

import { describe, expect, it } from 'vitest';

describe('Locale Consistency', () => {
  const LOCALES_PATH = path.join(process.cwd(), 'public', 'locales');
  const SOURCE_LOCALE = 'en'; // English is the source of truth

  // Helper function to recursively extract all keys from a JSON object
  function extractKeys(obj: any, prefix = ''): Set<string> {
    const keys = new Set<string>();

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          // Recursively extract keys from nested objects
          const nestedKeys = extractKeys(obj[key], fullKey);
          nestedKeys.forEach(k => keys.add(k));
        } else {
          // Add the key for primitive values and arrays
          keys.add(fullKey);
        }
      }
    }

    return keys;
  }

  // Helper function to read and parse a JSON file
  function readJsonFile(filePath: string): any {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  // Get all available locales
  function getAvailableLocales(): string[] {
    try {
      return fs.readdirSync(LOCALES_PATH)
        .filter(item => {
          const itemPath = path.join(LOCALES_PATH, item);
          return fs.statSync(itemPath).isDirectory();
        })
        .sort();
    } catch (error) {
      return [];
    }
  }

  // Get all translation files from a locale
  function getTranslationFiles(locale: string): string[] {
    const localePath = path.join(LOCALES_PATH, locale);
    try {
      return fs.readdirSync(localePath)
        .filter(file => file.endsWith('.json'))
        .sort();
    } catch (error) {
      return [];
    }
  }

  it('should have consistent translation files across all locales', () => {
    const locales = getAvailableLocales();
    expect(locales.length).toBeGreaterThan(0);
    expect(locales).toContain(SOURCE_LOCALE);

    const sourceFiles = getTranslationFiles(SOURCE_LOCALE);
    expect(sourceFiles.length).toBeGreaterThan(0);

    const missingFiles: { [file: string]: string[] } = {};

    // Check each locale for missing files
    locales.forEach(locale => {
      if (locale === SOURCE_LOCALE) return;

      const localeFiles = getTranslationFiles(locale);
      
      sourceFiles.forEach(file => {
        if (!localeFiles.includes(file)) {
          if (!missingFiles[file]) {
            missingFiles[file] = [];
          }
          missingFiles[file].push(locale);
        }
      });
    });

    // Generate error message if files are missing
    if (Object.keys(missingFiles).length > 0) {
      let errorMessage = '\nMissing translation files detected:\n\n';
      Object.entries(missingFiles).forEach(([file, locales]) => {
        errorMessage += `File "${file}" missing from locales: [${locales.join(', ')}]\n`;
      });
      
      console.error(errorMessage);
      expect(Object.keys(missingFiles).length).toBe(0);
    }
  });

  it('should have consistent translation keys across all locales', () => {
    const locales = getAvailableLocales();
    const sourceFiles = getTranslationFiles(SOURCE_LOCALE);
    
    const allMissingKeys: { [key: string]: { file: string; locales: string[] } } = {};
    const extraKeys: { [key: string]: { file: string; locales: string[] } } = {};

    sourceFiles.forEach(file => {
      const sourceFilePath = path.join(LOCALES_PATH, SOURCE_LOCALE, file);
      const sourceContent = readJsonFile(sourceFilePath);
      
      if (!sourceContent) {
        console.warn(`Could not read source file: ${sourceFilePath}`);
        return;
      }

      const sourceKeys = extractKeys(sourceContent);

      locales.forEach(locale => {
        if (locale === SOURCE_LOCALE) return;

        const localeFilePath = path.join(LOCALES_PATH, locale, file);
        const localeContent = readJsonFile(localeFilePath);

        if (!localeContent) {
          // File doesn't exist in this locale, skip key checking
          // (this is caught by the previous test)
          return;
        }

        const localeKeys = extractKeys(localeContent);

        // Check for missing keys (keys in source but not in locale)
        sourceKeys.forEach(key => {
          if (!localeKeys.has(key)) {
            const keyIdentifier = `${file}:${key}`;
            if (!allMissingKeys[keyIdentifier]) {
              allMissingKeys[keyIdentifier] = { file, locales: [] };
            }
            allMissingKeys[keyIdentifier].locales.push(locale);
          }
        });

        // Check for extra keys (keys in locale but not in source)
        localeKeys.forEach(key => {
          if (!sourceKeys.has(key)) {
            const keyIdentifier = `${file}:${key}`;
            if (!extraKeys[keyIdentifier]) {
              extraKeys[keyIdentifier] = { file, locales: [] };
            }
            extraKeys[keyIdentifier].locales.push(locale);
          }
        });
      });
    });

    // Also check all locales against each other for completeness
    sourceFiles.forEach(file => {
      const allKeysFromAllLocales = new Set<string>();
      
      // Collect all unique keys from all locales
      locales.forEach(locale => {
        const localeFilePath = path.join(LOCALES_PATH, locale, file);
        const localeContent = readJsonFile(localeFilePath);
        if (localeContent) {
          const localeKeys = extractKeys(localeContent);
          localeKeys.forEach(key => allKeysFromAllLocales.add(key));
        }
      });

      // Now check each locale has all keys found across all locales
      locales.forEach(locale => {
        const localeFilePath = path.join(LOCALES_PATH, locale, file);
        const localeContent = readJsonFile(localeFilePath);
        
        if (!localeContent) return;
        
        const localeKeys = extractKeys(localeContent);
        
        allKeysFromAllLocales.forEach(key => {
          if (!localeKeys.has(key)) {
            const keyIdentifier = `${file}:${key}`;
            if (!allMissingKeys[keyIdentifier]) {
              allMissingKeys[keyIdentifier] = { file, locales: [] };
            }
            if (!allMissingKeys[keyIdentifier].locales.includes(locale)) {
              allMissingKeys[keyIdentifier].locales.push(locale);
            }
          }
        });
      });
    });

    // Generate comprehensive error message
    let errorMessage = '';
    
    if (Object.keys(allMissingKeys).length > 0) {
      errorMessage += '\nMissing translation keys detected:\n\n';
      
      // Sort and group by key for better readability
      const sortedMissingKeys = Object.entries(allMissingKeys).sort(([a], [b]) => a.localeCompare(b));
      
      sortedMissingKeys.forEach(([keyIdentifier, { file, locales }]) => {
        const key = keyIdentifier.replace(`${file}:`, '');
        errorMessage += `Key "${key}" in "${file}" missing from locales: [${locales.sort().join(', ')}]\n`;
      });
    }

    if (Object.keys(extraKeys).length > 0) {
      errorMessage += '\nExtra translation keys detected (not in English source):\n\n';
      
      const sortedExtraKeys = Object.entries(extraKeys).sort(([a], [b]) => a.localeCompare(b));
      
      sortedExtraKeys.forEach(([keyIdentifier, { file, locales }]) => {
        const key = keyIdentifier.replace(`${file}:`, '');
        errorMessage += `Key "${key}" in "${file}" found in locales: [${locales.sort().join(', ')}] but not in English\n`;
      });
    }

    if (errorMessage) {
      // Add summary statistics
      const totalMissing = Object.values(allMissingKeys).reduce((sum, { locales }) => sum + locales.length, 0);
      const totalExtra = Object.values(extraKeys).reduce((sum, { locales }) => sum + locales.length, 0);
      
      errorMessage += `\nSummary:\n`;
      errorMessage += `- Total missing key instances: ${totalMissing}\n`;
      errorMessage += `- Total extra key instances: ${totalExtra}\n`;
      errorMessage += `- Locales checked: ${locales.length}\n`;
      errorMessage += `- Translation files checked: ${sourceFiles.length}\n`;
      
      console.error(errorMessage);
      expect(Object.keys(allMissingKeys).length + Object.keys(extraKeys).length).toBe(0);
    }
  });

  it('should have valid JSON in all translation files', () => {
    const locales = getAvailableLocales();
    const invalidFiles: string[] = [];

    locales.forEach(locale => {
      const files = getTranslationFiles(locale);
      
      files.forEach(file => {
        const filePath = path.join(LOCALES_PATH, locale, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          JSON.parse(content);
        } catch (error) {
          invalidFiles.push(`${locale}/${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    });

    if (invalidFiles.length > 0) {
      const errorMessage = `\nInvalid JSON files detected:\n\n${invalidFiles.join('\n')}`;
      console.error(errorMessage);
      expect(invalidFiles.length).toBe(0);
    }
  });
});