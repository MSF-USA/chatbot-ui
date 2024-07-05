import {
  IconAlignJustified,
  IconBulb,
  IconDatabase,
  IconHelpHexagon,
  IconLanguage,
  IconMail,
  IconSettingsAutomation,
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
];
