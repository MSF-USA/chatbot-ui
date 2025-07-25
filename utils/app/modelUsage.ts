/**
 * Model Usage Tracking Service
 * 
 * Tracks how frequently users select different AI models to enable
 * usage-based sorting in the model selection interface.
 */

const MODEL_USAGE_STORAGE_KEY = 'chatbot-ui-model-usage';

/**
 * Data structure for model usage tracking
 */
export interface ModelUsageData {
  [modelId: string]: number;
}

/**
 * Get the current model usage data from localStorage
 */
function getStoredUsageData(): ModelUsageData {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(MODEL_USAGE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to parse model usage data from localStorage:', error);
    return {};
  }
}

/**
 * Save model usage data to localStorage
 */
function saveUsageData(data: ModelUsageData): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(MODEL_USAGE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save model usage data to localStorage:', error);
  }
}

/**
 * Get the usage count for a specific model
 */
export function getModelUsageCount(modelId: string): number {
  const usageData = getStoredUsageData();
  return usageData[modelId] || 0;
}

/**
 * Increment the usage count for a specific model
 */
export function incrementModelUsage(modelId: string): void {
  const usageData = getStoredUsageData();
  usageData[modelId] = (usageData[modelId] || 0) + 1;
  saveUsageData(usageData);
}

/**
 * Get all model usage data
 */
export function getModelUsageData(): ModelUsageData {
  return getStoredUsageData();
}

/**
 * Clear all model usage data (useful for testing or user preference)
 */
export function clearModelUsageData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(MODEL_USAGE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear model usage data from localStorage:', error);
  }
}

/**
 * Get the most frequently used models (sorted by usage count descending)
 */
export function getMostUsedModels(limit: number = 5): Array<{ modelId: string; count: number }> {
  const usageData = getStoredUsageData();
  return Object.entries(usageData)
    .map(([modelId, count]) => ({ modelId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}