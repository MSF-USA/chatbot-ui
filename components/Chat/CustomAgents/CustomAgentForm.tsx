'use client';

import { FC, useState } from 'react';
import { IconX, IconAlertCircle, IconCheck, IconLoader2 } from '@tabler/icons-react';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { CustomAgent } from '@/lib/stores/settingsStore';

interface CustomAgentFormProps {
  onSave: (agent: CustomAgent) => void;
  onClose: () => void;
  existingAgent?: CustomAgent;
}

export const CustomAgentForm: FC<CustomAgentFormProps> = ({
  onSave,
  onClose,
  existingAgent,
}) => {
  const [name, setName] = useState(existingAgent?.name || '');
  const [agentId, setAgentId] = useState(existingAgent?.agentId || '');
  const [baseModelId, setBaseModelId] = useState<OpenAIModelID>(
    existingAgent?.baseModelId || OpenAIModelID.GPT_5
  );
  const [description, setDescription] = useState(existingAgent?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Available base models (excluding legacy and agent-only models)
  const baseModels = Object.values(OpenAIModels).filter(
    (m) => !m.isLegacy && !m.isAgent
  );

  const validateAgentId = (id: string): boolean => {
    // Azure AI Foundry agent IDs typically follow the pattern: asst_[alphanumeric]
    const agentIdPattern = /^asst_[A-Za-z0-9_-]+$/;
    return agentIdPattern.test(id);
  };

  const validateAgentConnection = async (): Promise<boolean> => {
    setIsValidating(true);
    setError(null);
    setValidationSuccess(false);

    try {
      const response = await fetch('/api/agents/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId: agentId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.details || data.error || 'Validation failed');
        return false;
      }

      setValidationSuccess(true);
      return true;
    } catch (err: any) {
      setError(err.message || 'Network error during validation');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationSuccess(false);

    // Basic validation
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }

    if (!agentId.trim()) {
      setError('Agent ID is required');
      return;
    }

    if (!validateAgentId(agentId)) {
      setError('Invalid Agent ID format. Expected format: asst_xxxxx');
      return;
    }

    // Validate connection to agent
    const isValid = await validateAgentConnection();
    if (!isValid) {
      return; // Error already set by validateAgentConnection
    }

    const agent: CustomAgent = {
      id: existingAgent?.id || `custom-agent-${Date.now()}`,
      name: name.trim(),
      agentId: agentId.trim(),
      baseModelId,
      description: description.trim() || undefined,
      createdAt: existingAgent?.createdAt || new Date().toISOString(),
    };

    onSave(agent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#212121] rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {existingAgent ? 'Edit Custom Agent' : 'Add Custom Agent'}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Experimental
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              MSF AI Assistant Foundry instance only
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Experimental Notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start">
              <IconAlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Important:</strong> Custom agents only work with the <strong>MSF AI Assistant Foundry instance</strong>.
                Agents must be created by an administrator in this specific Foundry instance and the Agent ID shared with you.
                External or personal Azure AI Foundry instances are not supported.
              </div>
            </div>
          </div>

          {/* Validation Success */}
          {validationSuccess && !error && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-start">
              <IconCheck size={18} className="mr-2 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Agent validated successfully! Connection confirmed.
              </span>
            </div>
          )}

          {/* Validation Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-start">
              <IconAlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Research Assistant"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Agent ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="asst_abc123def456"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              From MSF AI Assistant Foundry instance only (format: asst_xxxxx)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base Model
            </label>
            <select
              value={baseModelId}
              onChange={(e) => setBaseModelId(e.target.value as OpenAIModelID)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {baseModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The underlying model for this agent
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specialized agent for research tasks..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isValidating}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isValidating ? (
                <>
                  <IconLoader2 size={16} className="animate-spin" />
                  Validating...
                </>
              ) : (
                existingAgent ? 'Update Agent' : 'Add Agent'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
