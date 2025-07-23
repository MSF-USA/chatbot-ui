/**
 * Translation validation utilities for agent localization
 * Ensures completeness and quality of translations across all locales
 */
import { AgentType } from '@/types/agent';

import { getAgentNamespace } from './agentTranslations';

/**
 * Translation validation result
 */
export interface TranslationValidationResult {
  locale: string;
  namespace: string;
  valid: boolean;
  errors: TranslationError[];
  warnings: TranslationWarning[];
  stats: TranslationStats;
}

/**
 * Translation error types
 */
export interface TranslationError {
  type: 'missing_key' | 'empty_value' | 'invalid_params' | 'malformed_json';
  key: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Translation warning types
 */
export interface TranslationWarning {
  type: 'length_mismatch' | 'unused_params' | 'inconsistent_terminology';
  key: string;
  message: string;
  suggestion?: string;
}

/**
 * Translation statistics
 */
export interface TranslationStats {
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  emptyValues: number;
  completionPercentage: number;
}

/**
 * Required translation keys for each agent type
 */
export const REQUIRED_AGENT_KEYS: Record<string, string[]> = {
  common: [
    'agentTypes.web_search',
    'agentTypes.code_interpreter',
    'agentTypes.url_pull',
    'agentTypes.local_knowledge',
    'agentTypes.standard_chat',
    'agentTypes.foundry',
    'agentTypes.third_party',
    'error.title',
    'error.unknown',
    'error.retry',
    'error.fallback',
    'metadata.processingTime',
    'metadata.confidence',
    'metadata.tokens',
    'resultsPanel.placeholder',
  ],
  webSearch: [
    'resultsPanel.title',
    'resultsPanel.noResults',
    'resultsPanel.noData',
    'resultsPanel.confidence',
    'resultsPanel.source',
    'resultsPanel.citations',
    'resultsPanel.filters',
    'resultsPanel.sortBy',
    'resultsPanel.all',
    'resultsPanel.searchTime',
    'configuration.resultsCount',
    'configuration.safeSearch',
    'configuration.market',
    'status.searching',
    'status.optimizing',
    'status.processing',
  ],
  codeInterpreter: [
    'resultsPanel.title',
    'resultsPanel.noData',
    'resultsPanel.output',
    'resultsPanel.errors',
    'resultsPanel.executionTime',
    'resultsPanel.memoryUsage',
    'resultsPanel.executedCode',
    'resultsPanel.download',
    'resultsPanel.noOutput',
    'resultsPanel.noFiles',
    'status.success',
    'status.error',
    'status.timeout',
    'tabs.output',
    'tabs.code',
    'tabs.files',
  ],
  urlPull: [
    'resultsPanel.title',
    'resultsPanel.noData',
    'resultsPanel.summary',
    'resultsPanel.metadata',
    'resultsPanel.processingTime',
    'resultsPanel.preview',
    'resultsPanel.view',
    'configuration.timeout',
    'status.pulling',
    'status.analyzing',
    'status.complete',
  ],
  localKnowledge: [
    'resultsPanel.title',
    'resultsPanel.noData',
    'resultsPanel.documents',
    'resultsPanel.insights',
    'resultsPanel.relevance',
    'resultsPanel.suggestions',
    'configuration.searchMode',
    'configuration.threshold',
    'status.searching',
    'status.analyzing',
  ],
  ui: [
    'loading.default',
    'loading.searching',
    'loading.processing',
    'loading.analyzing',
    'buttons.retry',
    'buttons.cancel',
    'buttons.expand',
    'buttons.collapse',
    'buttons.configure',
    'buttons.submit',
    'labels.priority',
    'labels.estimatedTime',
    'labels.availability',
    'labels.configuration',
  ],
  errors: [
    'common.unknown',
    'common.network',
    'common.timeout',
    'common.unauthorized',
    'common.rateLimit',
    'common.serviceUnavailable',
    'webSearch.searchFailed',
    'webSearch.invalidQuery',
    'codeInterpreter.executionFailed',
    'codeInterpreter.invalidCode',
    'urlPull.fetchFailed',
    'urlPull.invalidUrl',
    'localKnowledge.searchFailed',
    'localKnowledge.noAccess',
  ],
  settings: [
    'autoSubmit',
    'advancedOptions',
    'priority.high',
    'priority.medium',
    'priority.low',
    'safeSearch.off',
    'safeSearch.moderate',
    'safeSearch.strict',
    'market.any',
    'market.local',
  ],
};

/**
 * Validate translation completeness for a specific locale and namespace
 * @param translations - Translation object to validate
 * @param namespace - Namespace to validate (e.g., 'agents')
 * @param locale - Locale code (e.g., 'en', 'es')
 * @returns Validation result
 */
export const validateTranslations = (
  translations: Record<string, any>,
  namespace: string,
  locale: string,
): TranslationValidationResult => {
  const errors: TranslationError[] = [];
  const warnings: TranslationWarning[] = [];

  // Get required keys for this namespace
  const requiredKeys = getRequiredKeysForNamespace(namespace);

  // Check for missing keys and empty values
  let translatedCount = 0;
  let missingCount = 0;
  let emptyCount = 0;

  for (const key of requiredKeys) {
    const value = getNestedValue(translations, key);

    if (value === undefined) {
      missingCount++;
      errors.push({
        type: 'missing_key',
        key,
        message: `Missing translation key: ${key}`,
        severity: 'error',
      });
    } else if (
      value === '' ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      emptyCount++;
      errors.push({
        type: 'empty_value',
        key,
        message: `Empty translation value for key: ${key}`,
        severity: 'error',
      });
    } else {
      translatedCount++;

      // Check for parameter consistency
      validateParameterUsage(key, value, errors);

      // Check for length concerns (too long/short)
      validateTranslationLength(key, value, warnings, locale);
    }
  }

  const stats: TranslationStats = {
    totalKeys: requiredKeys.length,
    translatedKeys: translatedCount,
    missingKeys: missingCount,
    emptyValues: emptyCount,
    completionPercentage: Math.round(
      (translatedCount / requiredKeys.length) * 100,
    ),
  };

  return {
    locale,
    namespace,
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
};

/**
 * Validate translations for all agent types
 * @param agentTranslations - Complete agent translations object
 * @param locale - Locale code
 * @returns Array of validation results for each namespace
 */
export const validateAllAgentTranslations = (
  agentTranslations: Record<string, any>,
  locale: string,
): TranslationValidationResult[] => {
  const results: TranslationValidationResult[] = [];

  // Validate each namespace
  for (const namespace of Object.keys(REQUIRED_AGENT_KEYS)) {
    const namespaceTranslations = agentTranslations[namespace] || {};
    const result = validateTranslations(
      namespaceTranslations,
      namespace,
      locale,
    );
    results.push(result);
  }

  return results;
};

/**
 * Get required translation keys for a specific namespace
 * @param namespace - Namespace (e.g., 'common', 'webSearch')
 * @returns Array of required keys
 */
export const getRequiredKeysForNamespace = (namespace: string): string[] => {
  return REQUIRED_AGENT_KEYS[namespace] || [];
};

/**
 * Get all required translation keys for all agent namespaces
 * @returns Record of namespace to required keys
 */
export const getAllRequiredKeys = (): Record<string, string[]> => {
  return REQUIRED_AGENT_KEYS;
};

/**
 * Validate parameter usage in translation strings
 * @param key - Translation key
 * @param value - Translation value
 * @param errors - Array to add errors to
 */
const validateParameterUsage = (
  key: string,
  value: string,
  errors: TranslationError[],
): void => {
  if (typeof value !== 'string') return;

  // Check for unmatched interpolation brackets
  const openBrackets = (value.match(/\{\{/g) || []).length;
  const closeBrackets = (value.match(/\}\}/g) || []).length;

  if (openBrackets !== closeBrackets) {
    errors.push({
      type: 'invalid_params',
      key,
      message: `Mismatched interpolation brackets in: ${value}`,
      severity: 'error',
    });
  }

  // Check for common parameter naming issues
  const invalidParams = value.match(/\{\{[^}]*[^a-zA-Z0-9_][^}]*\}\}/g);
  if (invalidParams) {
    errors.push({
      type: 'invalid_params',
      key,
      message: `Invalid parameter names found: ${invalidParams.join(', ')}`,
      severity: 'warning',
    });
  }
};

/**
 * Validate translation length for UI appropriateness
 * @param key - Translation key
 * @param value - Translation value
 * @param warnings - Array to add warnings to
 * @param locale - Locale code for context
 */
const validateTranslationLength = (
  key: string,
  value: string,
  warnings: TranslationWarning[],
  locale: string,
): void => {
  if (typeof value !== 'string') return;

  // UI element translations should be reasonably short
  if (key.includes('buttons.') && value.length > 30) {
    warnings.push({
      type: 'length_mismatch',
      key,
      message: `Button text may be too long (${value.length} chars): ${value}`,
      suggestion: 'Consider shortening for better UI fit',
    });
  }

  // Labels should be concise
  if (key.includes('labels.') && value.length > 50) {
    warnings.push({
      type: 'length_mismatch',
      key,
      message: `Label text may be too long (${value.length} chars): ${value}`,
      suggestion: 'Consider using shorter terminology',
    });
  }

  // Very short translations might be incomplete
  if (value.trim().length < 2 && !key.includes('abbreviation')) {
    warnings.push({
      type: 'length_mismatch',
      key,
      message: `Translation appears too short: "${value}"`,
      suggestion: 'Verify this is a complete translation',
    });
  }
};

/**
 * Get nested value from object using dot notation
 * @param obj - Object to search
 * @param path - Dot notation path (e.g., 'common.error.title')
 * @returns Value at path or undefined
 */
const getNestedValue = (obj: Record<string, any>, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Check if a locale has complete agent translations
 * @param agentTranslations - Agent translations object
 * @param locale - Locale code
 * @returns True if complete, false otherwise
 */
export const isLocaleComplete = (
  agentTranslations: Record<string, any>,
  locale: string,
): boolean => {
  const results = validateAllAgentTranslations(agentTranslations, locale);
  return results.every((result) => result.valid);
};

/**
 * Get completion percentage for a locale
 * @param agentTranslations - Agent translations object
 * @param locale - Locale code
 * @returns Completion percentage (0-100)
 */
export const getLocaleCompletionPercentage = (
  agentTranslations: Record<string, any>,
  locale: string,
): number => {
  const results = validateAllAgentTranslations(agentTranslations, locale);
  const totalKeys = results.reduce(
    (sum, result) => sum + result.stats.totalKeys,
    0,
  );
  const translatedKeys = results.reduce(
    (sum, result) => sum + result.stats.translatedKeys,
    0,
  );

  return totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;
};

/**
 * Generate translation validation report
 * @param agentTranslations - Agent translations object
 * @param locale - Locale code
 * @returns Formatted validation report
 */
export const generateValidationReport = (
  agentTranslations: Record<string, any>,
  locale: string,
): string => {
  const results = validateAllAgentTranslations(agentTranslations, locale);
  const completion = getLocaleCompletionPercentage(agentTranslations, locale);

  let report = `\n=== Translation Validation Report for ${locale.toUpperCase()} ===\n`;
  report += `Overall Completion: ${completion}%\n\n`;

  for (const result of results) {
    report += `${result.namespace.toUpperCase()}:\n`;
    report += `  Completion: ${result.stats.completionPercentage}%\n`;
    report += `  Translated: ${result.stats.translatedKeys}/${result.stats.totalKeys}\n`;

    if (result.errors.length > 0) {
      report += `  Errors: ${result.errors.length}\n`;
      for (const error of result.errors.slice(0, 5)) {
        // Show first 5 errors
        report += `    - ${error.key}: ${error.message}\n`;
      }
      if (result.errors.length > 5) {
        report += `    ... and ${result.errors.length - 5} more errors\n`;
      }
    }

    if (result.warnings.length > 0) {
      report += `  Warnings: ${result.warnings.length}\n`;
    }

    report += '\n';
  }

  return report;
};
