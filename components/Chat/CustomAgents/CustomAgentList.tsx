'use client';

import { FC, useState } from 'react';
import { IconTrash, IconEdit, IconRobot, IconAlertCircle } from '@tabler/icons-react';
import { CustomAgent } from '@/lib/stores/settingsStore';
import { OpenAIModels } from '@/types/openai';

interface CustomAgentListProps {
  agents: CustomAgent[];
  onEdit: (agent: CustomAgent) => void;
  onDelete: (agentId: string) => void;
}

export const CustomAgentList: FC<CustomAgentListProps> = ({
  agents,
  onEdit,
  onDelete,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = (agentId: string) => {
    if (deleteConfirm === agentId) {
      onDelete(agentId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(agentId);
      // Reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  if (agents.length === 0) {
    return (
      <div className="p-8 text-center">
        <IconRobot size={48} className="mx-auto mb-3 text-gray-400 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No custom agents configured yet.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Add an agent to get started with Azure AI Foundry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const baseModel = OpenAIModels[agent.baseModelId];
        const isDeleting = deleteConfirm === agent.id;

        return (
          <div
            key={agent.id}
            className="p-4 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {agent.name}
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <IconRobot size={12} className="mr-1" />
                    Custom
                  </span>
                </div>

                {agent.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {agent.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Agent ID:</span>{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {agent.agentId}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Base Model:</span> {baseModel?.name || 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onEdit(agent)}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="Edit agent"
                >
                  <IconEdit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className={`p-2 transition-colors ${
                    isDeleting
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400'
                  }`}
                  title={isDeleting ? 'Click again to confirm' : 'Delete agent'}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            </div>

            {isDeleting && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 flex items-start">
                <IconAlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <span className="text-xs text-red-700 dark:text-red-300">
                  Click delete again to confirm removal
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
