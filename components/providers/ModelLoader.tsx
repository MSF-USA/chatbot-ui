'use client';

import { useEffect } from 'react';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

/**
 * Component that initializes models from the predefined OpenAIModels constant
 */
export function ModelLoader() {
  const { setModels, setDefaultModelId } = useSettings();

  useEffect(() => {
    // Convert OpenAIModels object to array, excluding legacy models
    const models: OpenAIModel[] = Object.values(OpenAIModels).filter(m => !m.isLegacy);

    setModels(models);

    // Set default model to GPT-4o (or first available model)
    const defaultModel = models.find(m => m.id === OpenAIModelID.GPT_4o) || models[0];

    if (defaultModel) {
      setDefaultModelId(defaultModel.id as OpenAIModelID);
    }
  }, [setModels, setDefaultModelId]);

  return null; // This component doesn't render anything
}
