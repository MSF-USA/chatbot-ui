import {
  IconBuilding,
  IconChevronDown,
  IconChevronRight,
  IconInfoCircle,
  IconPlus,
  IconRobotFace,
} from '@tabler/icons-react';
import React, { FC, useState } from 'react';

import { useTranslations } from 'next-intl';

import { OpenAIModel } from '@/types/openai';

import { CustomAgentList } from '../CustomAgents/CustomAgentList';
import { OrganizationAgentList } from '../OrganizationAgents/OrganizationAgentList';

import { CustomAgent } from '@/client/stores/settingsStore';
import { getOrganizationAgents } from '@/lib/organizationAgents';

interface AgentsTabProps {
  showAgentWarning: boolean;
  setShowAgentWarning: (show: boolean) => void;
  openAgentForm: () => void;
  customAgents: CustomAgent[];
  handleEditAgent: (agent: CustomAgent) => void;
  handleDeleteAgent: (agentId: string) => void;
  handleImportAgents: (agents: CustomAgent[]) => void;
  handleModelSelect: (model: OpenAIModel) => void;
  customAgentModels: OpenAIModel[];
  organizationAgentModels: OpenAIModel[];
  selectedModelId: string | null | undefined;
  defunctAgentIds: Set<string>;
}

export const AgentsTab: FC<AgentsTabProps> = ({
  showAgentWarning,
  setShowAgentWarning,
  openAgentForm,
  customAgents,
  handleEditAgent,
  handleDeleteAgent,
  handleImportAgents,
  handleModelSelect,
  customAgentModels,
  organizationAgentModels,
  selectedModelId,
  defunctAgentIds,
}) => {
  const t = useTranslations();
  const organizationAgents = getOrganizationAgents();
  const hasOrganizationAgents = organizationAgents.length > 0;
  const hasCustomAgents = customAgents.length > 0;

  // Custom Agents section is expanded by default only if user has custom agents
  const [customAgentsExpanded, setCustomAgentsExpanded] =
    useState(hasCustomAgents);

  return (
    <div
      className="flex-1 overflow-y-auto animate-fade-in-fast"
      key="agents-tab"
    >
      <div className="px-4 md:px-0">
        {/* Organization Agents Section */}
        {hasOrganizationAgents && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <IconBuilding
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Organization Agents
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({organizationAgents.length})
              </span>
            </div>
            <OrganizationAgentList
              onSelect={(agent) => {
                const agentModel = organizationAgentModels.find(
                  (m) => m.id === `org-${agent.id}`,
                );
                if (agentModel) {
                  handleModelSelect(agentModel);
                }
              }}
              selectedAgentId={selectedModelId ?? undefined}
            />
          </section>
        )}

        {/* Divider */}
        {hasOrganizationAgents && (
          <div className="border-t border-gray-200 dark:border-gray-700 my-6" />
        )}

        {/* Custom Agents Section - Collapsible */}
        <section>
          <button
            onClick={() => setCustomAgentsExpanded(!customAgentsExpanded)}
            className="w-full flex items-center gap-2 mb-4 group"
          >
            {customAgentsExpanded ? (
              <IconChevronDown
                size={18}
                className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              />
            ) : (
              <IconChevronRight
                size={18}
                className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              />
            )}
            <IconRobotFace
              size={20}
              className="text-purple-600 dark:text-purple-400"
            />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Custom Agents
            </h3>
            {hasCustomAgents && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({customAgents.length})
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Advanced
            </span>
          </button>

          {customAgentsExpanded && (
            <div className="pl-7 space-y-4">
              {/* Info Box - only show if no custom agents yet */}
              {!hasCustomAgents && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAgentWarning(!showAgentWarning);
                    }}
                    className="w-full p-3 flex items-center gap-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <IconInfoCircle
                      size={18}
                      className="flex-shrink-0 text-blue-600 dark:text-blue-400"
                    />
                    <span className="flex-1 text-left text-sm text-blue-700 dark:text-blue-300">
                      Requires coordination with AI Assistant team
                    </span>
                    <IconChevronDown
                      size={18}
                      className={`flex-shrink-0 text-blue-600 dark:text-blue-400 transition-transform ${
                        showAgentWarning ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {showAgentWarning && (
                    <div className="px-3 pb-3 text-sm text-blue-700 dark:text-blue-300">
                      {t('modelSelect.agents.advancedFeatureWarning')}
                    </div>
                  )}
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={() => openAgentForm()}
                className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all flex items-center justify-center gap-2"
              >
                <IconPlus size={18} />
                Create Custom Agent
              </button>

              {/* Custom Agents List */}
              {hasCustomAgents && (
                <CustomAgentList
                  agents={customAgents}
                  onEdit={handleEditAgent}
                  onDelete={handleDeleteAgent}
                  onImport={handleImportAgents}
                  onSelect={(agent) => {
                    const agentModel = customAgentModels.find(
                      (m) => m.id === `custom-${agent.id}`,
                    );
                    if (agentModel) {
                      handleModelSelect(agentModel);
                    }
                  }}
                  selectedModelId={selectedModelId ?? undefined}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 px-4 md:px-0">
        <button
          onClick={() => openAgentForm()}
          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2"
        >
          <IconPlus size={18} />
          {t('modelSelect.agents.createNewAgent')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-0">
        {customAgents.length > 0 ? (
          <CustomAgentList
            agents={customAgents}
            onEdit={handleEditAgent}
            onDelete={handleDeleteAgent}
            onImport={handleImportAgents}
            onSelect={(agent) => {
              const agentModel = customAgentModels.find(
                (m) => m.id === `custom-${agent.id}`,
              );
              if (agentModel) {
                handleModelSelect(agentModel);
              }
            }}
            selectedModelId={selectedModelId ?? undefined}
            defunctAgentIds={defunctAgentIds}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <AzureAIIcon className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('modelSelect.agents.noAgentsTitle')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              {t('modelSelect.agents.noAgentsDescription')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
