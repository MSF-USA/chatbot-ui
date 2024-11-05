import { IconFileCheck, IconNews } from '@tabler/icons-react';

export interface Bot {
  id: string;
  name: string;
  description: string;
  icon: typeof IconNews;
  color: string;
  prompt: string;
  sources?: Array<{ name: string; url: string; updated: string }>;
}

export const bots: Bot[] = [
  {
    id: 'msf_communications',
    name: 'MSF Communications',
    description:
      'Knowledgeable in publicly accessible data from msf.org and doctorswithoutborders.org',
    icon: IconNews,
    color: '#4190f2',
    prompt:
      'You are a bot with knowledge from msf.org and doctorswithoutborders.org.',
    sources: [
      {
        name: 'doctorswithoutborders.org',
        url: 'https://www.doctorswithoutborders.org',
        updated: 'August 18, 2024',
      },
      {
        name: 'msf.org',
        url: 'https://www.msf.org',
        updated: 'August 18, 2024',
      },
    ],
  },
  {
    id: 'content_validator',
    name: 'Content Validator',
    description:
      'Validates content against MSF style guides and communications data',
    icon: IconFileCheck,
    color: '#34a853',
    prompt:
      'You are a content validation bot that checks text against MSF style guides and ensures alignment with external communications.',
    sources: [
      {
        name: 'MSF Style Guide',
        url: '#',
        updated: 'Current',
      },
      {
        name: 'MSF External Communications',
        url: '#',
        updated: 'August 18, 2024',
      },
    ],
  },
];

export const getBotById = (id: string): Bot | undefined => {
  return bots.find((bot) => bot.id === id);
};
