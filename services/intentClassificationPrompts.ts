/**
 * Intent Classification Prompts and Schemas (DEPRECATED)
 * 
 * This file has been replaced by the centralized agent configuration system.
 * All functionality is now provided by CentralizedIntentService which uses
 * the agent registry for configuration.
 * 
 * This file is kept for backward compatibility only and will be removed
 * in a future version.
 */

import { AgentType } from '@/types/agent';
import { getCentralizedIntentService } from './centralizedIntentService';

// Export compatibility layer
export const SYSTEM_PROMPTS = new Proxy({}, {
  get(target, prop) {
    if (typeof prop === 'string') {
      return getCentralizedIntentService().getSystemPrompt(prop);
    }
    return undefined;
  }
});

export const ENHANCED_CLASSIFICATION_SCHEMA = getCentralizedIntentService().getClassificationSchema();

export const AGENT_SPECIFIC_GUIDANCE = new Proxy({}, {
  get(target, prop) {
    if (typeof prop === 'string') {
      return getCentralizedIntentService().getAgentGuidance(prop as AgentType);
    }
    return undefined;
  }
});

export function buildContextualPrompt(
  query: string,
  locale: string,
  conversationHistory?: string[],
  additionalContext?: Record<string, any>,
): string {
  return getCentralizedIntentService().buildContextualPrompt(
    query,
    locale,
    conversationHistory,
    additionalContext
  );
}

export function getAgentGuidance(agentType: AgentType) {
  return getCentralizedIntentService().getAgentGuidance(agentType);
}

export function validateConfidenceScore(confidence: number): boolean {
  return getCentralizedIntentService().validateConfidenceScore(confidence);
}

// Export all agent-specific patterns for backward compatibility
export const AGENT_EXCLUSION_PATTERNS = getCentralizedIntentService().getExclusionPatterns();

export const USER_PROMPT_TEMPLATES = {
  en: getCentralizedIntentService().buildContextualPrompt('{query}', 'en'),
  es: getCentralizedIntentService().buildContextualPrompt('{query}', 'es'),
  fr: getCentralizedIntentService().buildContextualPrompt('{query}', 'fr'),
  de: getCentralizedIntentService().buildContextualPrompt('{query}', 'de'),
  it: getCentralizedIntentService().buildContextualPrompt('{query}', 'it'),
  pt: getCentralizedIntentService().buildContextualPrompt('{query}', 'pt'),
  ja: getCentralizedIntentService().buildContextualPrompt('{query}', 'ja'),
  ko: getCentralizedIntentService().buildContextualPrompt('{query}', 'ko'),
  zh: getCentralizedIntentService().buildContextualPrompt('{query}', 'zh'),
};

export const CONFIDENCE_GUIDELINES = getCentralizedIntentService().getConfidenceGuidelines();