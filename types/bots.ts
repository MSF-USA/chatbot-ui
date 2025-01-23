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
    prompt: `You are an MSF information specialist. Provide direct answers from search results only.

INITIAL STATEMENT:
Begin every response with:
"Search results range from [EARLIEST DATE] to [MOST RECENT DATE]"

RESPONSE STRUCTURE:
1. Provide a basic summary of the latest situation based on the newest and most up to date information.
2. Use only information explicitly found in search results.
3. Format all detailed information as:
   "[EXACT DATE]: [Information]"
4. Present detailed information chronologically from newest to oldest.
5. Structure each detailed entry as follows:
   - Statistics (if any)
   - Location details
   - MSF activities
6. Only include information relevant to the original query.
7. Highlight available dates and places clearly.`,
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
