/**
 * Prompt Usage Tracking Service
 * 
 * Tracks how frequently users select different prompts to enable
 * usage-based sorting in the prompt selection interface.
 */

const PROMPT_USAGE_STORAGE_KEY = 'chatbot-ui-prompt-usage';

/**
 * Data structure for prompt usage tracking
 */
export interface PromptUsageData {
  [promptId: string]: number;
}

/**
 * Get the current prompt usage data from localStorage
 */
function getStoredUsageData(): PromptUsageData {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(PROMPT_USAGE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to parse prompt usage data from localStorage:', error);
    return {};
  }
}

/**
 * Save prompt usage data to localStorage
 */
function saveUsageData(data: PromptUsageData): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(PROMPT_USAGE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save prompt usage data to localStorage:', error);
  }
}

/**
 * Get the usage count for a specific prompt
 */
export function getPromptUsageCount(promptId: string): number {
  const usageData = getStoredUsageData();
  return usageData[promptId] || 0;
}

/**
 * Increment the usage count for a specific prompt
 */
export function incrementPromptUsage(promptId: string): void {
  const usageData = getStoredUsageData();
  usageData[promptId] = (usageData[promptId] || 0) + 1;
  saveUsageData(usageData);
}

/**
 * Get all prompt usage data
 */
export function getPromptUsageData(): PromptUsageData {
  return getStoredUsageData();
}

/**
 * Clear all prompt usage data (useful for testing or user preference)
 */
export function clearPromptUsageData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(PROMPT_USAGE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear prompt usage data from localStorage:', error);
  }
}

/**
 * Get the most frequently used prompts (sorted by usage count descending)
 */
export function getMostUsedPrompts(limit: number = 5): Array<{ promptId: string; count: number }> {
  const usageData = getStoredUsageData();
  return Object.entries(usageData)
    .map(([promptId, count]) => ({ promptId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}