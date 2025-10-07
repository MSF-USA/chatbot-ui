'use client';

import { useEffect } from 'react';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { getDefaultModel, isModelDisabled } from '@/config/models';

/**
 * Component that initializes models from the predefined OpenAIModels constant
 * Filters based on environment configuration
 */
export function ModelLoader() {
  const { setModels, setDefaultModelId } = useSettings();

  useEffect(() => {
    // Convert OpenAIModels object to array, excluding legacy and disabled models
    const models: OpenAIModel[] = Object.values(OpenAIModels).filter(
      m => !m.isLegacy && !isModelDisabled(m.id)
    );

    setModels(models);

    // Set default model from environment config
    const defaultModelId = getDefaultModel();
    const defaultModel = models.find(m => m.id === defaultModelId) || models[0];

    if (defaultModel) {
      setDefaultModelId(defaultModel.id as OpenAIModelID);
    }
  }, [setModels, setDefaultModelId]);

  return null; // This component doesn't render anything
}
