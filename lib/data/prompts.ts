import {
  IconBriefcase,
  IconBulb,
  IconCalendar,
  IconChecklist,
  IconFileAnalytics,
  IconFileText,
  IconGitMerge,
  IconMail,
  IconPresentation,
  IconReportAnalytics,
  IconSourceCode,
} from '@tabler/icons-react';
import { ComponentType, SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Icon mappings for suggested prompts.
 * Prompt text content is stored in translations (emptyState.suggestedPrompts).
 */
export const suggestedPromptIcons: Record<string, IconComponent> = {
  createDiagrams: IconGitMerge,
  draftContent: IconMail,
  analyzeInformation: IconReportAnalytics,
  planOrganize: IconChecklist,
  brainstormIdeas: IconBulb,
  buildPresentations: IconPresentation,
  workWithCode: IconSourceCode,
  decisionSupport: IconBriefcase,
  summarizeSynthesize: IconFileText,
  explainTopics: IconFileAnalytics,
  createSchedules: IconCalendar,
};
