'use client';

import { IconDatabase, IconRobot } from '@tabler/icons-react';
import { FC } from 'react';

import { OrganizationAgent } from '@/types/organizationAgent';

import {
  getIconComponent,
  getOrganizationAgents,
} from '@/lib/organizationAgents';

interface OrganizationAgentListProps {
  onSelect: (agent: OrganizationAgent) => void;
  selectedAgentId?: string;
}

export const OrganizationAgentList: FC<OrganizationAgentListProps> = ({
  onSelect,
  selectedAgentId,
}) => {
  const agents = getOrganizationAgents();

  if (agents.length === 0) {
    return (
      <div className="p-8 text-center">
        <IconRobot
          size={48}
          className="mx-auto mb-3 text-gray-400 dark:text-gray-600"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No organization agents configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const IconComp = getIconComponent(agent.icon);
        const isSelected = selectedAgentId === `org-${agent.id}`;

        return (
          <div
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`p-4 bg-white dark:bg-[#2A2A2A] border-2 rounded-lg transition-colors cursor-pointer ${
              isSelected
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: agent.color + '20' }}
              >
                <IconComp size={24} style={{ color: agent.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {agent.name}
                  </h4>
                  {agent.type === 'rag' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <IconDatabase size={12} />
                      Knowledge Base
                    </span>
                  )}
                  {agent.type === 'foundry' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      <IconRobot size={12} />
                      AI Agent
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {agent.description}
                </p>

                {agent.sources && agent.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {agent.sources.map((source) => (
                      <span
                        key={source.url}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      >
                        {source.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
