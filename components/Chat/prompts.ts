import {
  IconAlignJustified,
  IconBulb,
  IconCalendar,
  IconCheckbox,
  IconDatabase,
  IconHelpHexagon,
  IconLanguage,
  IconMail,
  IconPresentation,
  IconSettingsAutomation,
  IconTextScan2,
} from '@tabler/icons-react';

export const suggestedPrompts = [
  {
    title: 'Translate Something',
    prompt: 'I would like some text translated.',
    icon: IconLanguage,
  },
  {
    title: 'Draft an Email',
    prompt: 'Can you draft an email on a specific subject for me?',
    icon: IconMail,
  },
  {
    title: 'Brainstorm Ideas',
    prompt: 'I need assistance brainstorming about a specific idea.',
    icon: IconBulb,
  },
  {
    title: 'Summarize Text',
    prompt: 'I need a large set of text summarized.',
    icon: IconAlignJustified,
  },
  {
    title: 'Analyze Data',
    prompt: 'I need some data analyzed.',
    icon: IconDatabase,
  },
  {
    title: 'Automate Something',
    prompt:
      'I need to automate something for work. Can you suggest some ways I might do that based on the task?',
    icon: IconSettingsAutomation,
  },
  {
    title: 'Suggest Some Options for Help',
    prompt:
      "I'm not sure where to start with how I might need assistance. Can you suggest some ways in which you can help?",
    icon: IconHelpHexagon,
  },
  {
    title: 'Revise Text',
    prompt:
      'I have a chunk of text which needs revision. Please examine the text and revise it to the best of your ability.',
    icon: IconTextScan2,
  },
  {
    title: 'Create A Presentation',
    prompt:
      'I need to create a compelling presentation on a specific subject. Please help me outline or draft it.',
    icon: IconPresentation,
  },
  {
    title: 'Generate Meeting Agenda',
    prompt: 'Can you help me create an agenda for an upcoming meeting?',
    icon: IconCalendar,
  },
  {
    title: 'Develop A Survey',
    prompt:
      'Can you help me design a survey to gather feedback or information on a particular topic?',
    icon: IconCheckbox,
  },
];
