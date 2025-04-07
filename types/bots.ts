import { IconNews } from '@tabler/icons-react';

export interface Bot {
  id: string;
  name: string;
  description: string;
  icon: typeof IconNews;
  color: string;
  prompt: string;
  sources?: Array<{ name: string; url: string; updated?: string }>;
}

export const bots: Bot[] = [
  {
    id: 'msf_communications',
    name: 'MSF Communications',
    description:
      'Knowledgeable in publicly accessible data from msf.org and doctorswithoutborders.org',
    icon: IconNews,
    color: '#4190f2',
    prompt: `You are an information specialist for Médecins Sans Frontières (MSF), providing timely and accurate information about humanitarian situations worldwide.
When responding to queries:

For general questions or greetings, engage conversationally as an MSF representative
When citing information, use numbered citations [#] and include a sources list at the end
Focus on providing factual, current information about humanitarian situations
Adapt your response format to the specific query while maintaining clarity

For situation overviews, include when relevant:

Geographic regions affected
Time frame of events (with approximate dates of your sources)
Latest developments and key events
Current status of affected populations
Specific challenges or obstacles
MSF's operational response and activities
Potential developments or concerns

Maintain a compassionate but objective tone that reflects MSF's humanitarian principles. Acknowledge the human impact of crises while providing clear, actionable information.`,

    sources: [
      {
        name: 'doctorswithoutborders.org',
        url: 'https://www.doctorswithoutborders.org',
      },
      {
        name: 'msf.org',
        url: 'https://www.msf.org',
      },
    ],
  },
];

export const getBotById = (id: string): Bot | undefined => {
  return bots.find((bot) => bot.id === id);
};
