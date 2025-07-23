/**
 * Agent-specific translation utilities
 * Lightweight helpers that work with existing next-i18next infrastructure
 */
import { TFunction } from 'next-i18next';

import { AgentType } from '@/types/agent';

/**
 * Get a translation for a specific agent type and key
 * @param t - Translation function from useTranslation
 * @param agentType - Type of agent
 * @param key - Translation key (supports nested keys with dot notation)
 * @param params - Optional parameters for interpolation
 * @returns Translated string
 */
export const getAgentTranslation = (
  t: TFunction,
  agentType: AgentType,
  key: string,
  params?: Record<string, any>,
): string => {
  // Try agent-specific translation first
  const agentKey = `agents:${getAgentNamespace(agentType)}.${key}`;
  const translation = t(agentKey, params);

  // If translation is the same as the key, it wasn't found
  if (translation === agentKey) {
    // Fallback to common agent translation
    const commonKey = `agents:common.${key}`;
    const commonTranslation = t(commonKey, params);

    if (commonTranslation === commonKey) {
      // Final fallback to the key itself (for development)
      console.warn(`Missing translation for key: ${agentKey}`);
      return key;
    }

    return commonTranslation;
  }

  return translation;
};

/**
 * Get common agent translation (shared across all agent types)
 * @param t - Translation function from useTranslation
 * @param key - Translation key
 * @param params - Optional parameters for interpolation
 * @returns Translated string
 */
export const getCommonAgentTranslation = (
  t: TFunction,
  key: string,
  params?: Record<string, any>,
): string => {
  return t(`agents:common.${key}`, params);
};

/**
 * Get agent error message translation
 * @param t - Translation function from useTranslation
 * @param agentType - Type of agent
 * @param errorKey - Error message key
 * @param params - Optional parameters for error details
 * @returns Translated error message
 */
export const getAgentErrorTranslation = (
  t: TFunction,
  agentType: AgentType,
  errorKey: string,
  params?: Record<string, any>,
): string => {
  const specificKey = `agents:errors.${getAgentNamespace(
    agentType,
  )}.${errorKey}`;
  const translation = t(specificKey, params);

  if (translation === specificKey) {
    // Fallback to common error
    const commonKey = `agents:errors.common.${errorKey}`;
    const commonTranslation = t(commonKey, params);

    if (commonTranslation === commonKey) {
      // Final fallback to generic error
      return t('agents:errors.common.unknown', { agentType, ...params });
    }

    return commonTranslation;
  }

  return translation;
};

/**
 * Get UI element translation for agents
 * @param t - Translation function from useTranslation
 * @param key - UI element key
 * @param params - Optional parameters for interpolation
 * @returns Translated UI string
 */
export const getAgentUITranslation = (
  t: TFunction,
  key: string,
  params?: Record<string, any>,
): string => {
  return t(`agents:ui.${key}`, params);
};

/**
 * Get agent settings/preferences translation
 * @param t - Translation function from useTranslation
 * @param key - Settings key
 * @param params - Optional parameters for interpolation
 * @returns Translated settings string
 */
export const getAgentSettingsTranslation = (
  t: TFunction,
  key: string,
  params?: Record<string, any>,
): string => {
  return t(`agents:settings.${key}`, params);
};

/**
 * Convert AgentType enum to namespace string for translations
 * @param agentType - Agent type enum value
 * @returns Namespace string for translation keys
 */
export const getAgentNamespace = (agentType: AgentType): string => {
  switch (agentType) {
    case AgentType.WEB_SEARCH:
      return 'webSearch';
    case AgentType.CODE_INTERPRETER:
      return 'codeInterpreter';
    case AgentType.URL_PULL:
      return 'urlPull';
    case AgentType.LOCAL_KNOWLEDGE:
      return 'localKnowledge';
    case AgentType.STANDARD_CHAT:
      return 'standardChat';
    case AgentType.FOUNDRY:
      return 'foundry';
    case AgentType.THIRD_PARTY:
      return 'thirdParty';
    default:
      return 'common';
  }
};

/**
 * Get all supported agent namespaces
 * @returns Array of agent namespace strings
 */
export const getAgentNamespaces = (): string[] => {
  return Object.values(AgentType).map(getAgentNamespace);
};

/**
 * Pluralization helper for agent-related content
 * @param t - Translation function from useTranslation
 * @param key - Base translation key
 * @param count - Number for pluralization
 * @param params - Optional parameters for interpolation
 * @returns Pluralized translated string
 */
export const getAgentPluralTranslation = (
  t: TFunction,
  key: string,
  count: number,
  params?: Record<string, any>,
): string => {
  return t(key, { count, ...params });
};

/**
 * Get time-based translation with appropriate formatting
 * @param t - Translation function from useTranslation
 * @param key - Translation key
 * @param timeValue - Time value (in seconds or milliseconds)
 * @param unit - Time unit ('seconds', 'milliseconds', 'minutes')
 * @param params - Optional parameters for interpolation
 * @returns Formatted time translation
 */
export const getAgentTimeTranslation = (
  t: TFunction,
  key: string,
  timeValue: number,
  unit: 'seconds' | 'milliseconds' | 'minutes' = 'seconds',
  params?: Record<string, any>,
): string => {
  let formattedTime: number;

  switch (unit) {
    case 'milliseconds':
      formattedTime = Math.round((timeValue / 1000) * 10) / 10; // Round to 1 decimal
      break;
    case 'minutes':
      formattedTime = Math.round(timeValue * 60);
      break;
    default:
      formattedTime = timeValue;
  }

  return t(key, { time: formattedTime, ...params });
};

/**
 * Get confidence score translation with appropriate formatting
 * @param t - Translation function from useTranslation
 * @param key - Translation key
 * @param confidence - Confidence score (0-1)
 * @param params - Optional parameters for interpolation
 * @returns Formatted confidence translation
 */
export const getAgentConfidenceTranslation = (
  t: TFunction,
  key: string,
  confidence: number,
  params?: Record<string, any>,
): string => {
  const percentage = Math.round(confidence * 100);
  return t(key, { confidence: percentage, ...params });
};

/**
 * Check if a translation key exists for a specific agent type
 * @param t - Translation function from useTranslation
 * @param agentType - Type of agent
 * @param key - Translation key to check
 * @returns True if translation exists, false otherwise
 */
export const hasAgentTranslation = (
  t: TFunction,
  agentType: AgentType,
  key: string,
): boolean => {
  const agentKey = `agents:${getAgentNamespace(agentType)}.${key}`;
  const translation = t(agentKey);
  return translation !== agentKey;
};

/**
 * Get all missing translations for a specific agent type
 * @param t - Translation function from useTranslation
 * @param agentType - Type of agent
 * @param requiredKeys - Array of required translation keys
 * @returns Array of missing translation keys
 */
export const getMissingAgentTranslations = (
  t: TFunction,
  agentType: AgentType,
  requiredKeys: string[],
): string[] => {
  return requiredKeys.filter((key) => !hasAgentTranslation(t, agentType, key));
};

/**
 * Format agent-specific template strings with parameters
 * @param template - Template string with {{parameter}} placeholders
 * @param params - Parameters to substitute
 * @returns Formatted string
 */
export const formatAgentTemplate = (
  template: string,
  params: Record<string, any>,
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
};

/**
 * Agent translation validation errors
 */
export interface AgentTranslationValidationError {
  agentType: AgentType;
  key: string;
  error: 'missing' | 'invalid_params' | 'empty_value';
  details?: string;
}

/**
 * Validate agent translations for completeness and correctness
 * @param t - Translation function from useTranslation
 * @param agentType - Type of agent to validate
 * @param requiredKeys - Array of required translation keys
 * @returns Array of validation errors
 */
export const validateAgentTranslations = (
  t: TFunction,
  agentType: AgentType,
  requiredKeys: string[],
): AgentTranslationValidationError[] => {
  const errors: AgentTranslationValidationError[] = [];

  for (const key of requiredKeys) {
    const agentKey = `agents:${getAgentNamespace(agentType)}.${key}`;
    const translation = t(agentKey);

    if (translation === agentKey) {
      errors.push({
        agentType,
        key,
        error: 'missing',
        details: `Translation key not found: ${agentKey}`,
      });
    } else if (!translation || translation.trim() === '') {
      errors.push({
        agentType,
        key,
        error: 'empty_value',
        details: `Translation exists but is empty: ${agentKey}`,
      });
    }
  }

  return errors;
};
