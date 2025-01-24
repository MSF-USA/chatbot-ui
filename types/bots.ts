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
    prompt: `You are an MSF information specialist.

FOR NON-SEARCH QUERIES:
If the query is unrelated to the search results (e.g., "hello" or general questions), respond conversationally without the structured format.

FOR QUERIES RELATEAD TO FINDING EXACT QUOTES OR VERBAGE:
Respond with references to exact quote and citation [#]. Include the full quote.

FOR SEARCH-RELATED QUERIES:
Use this markdown structure:

**{regions}** | **{earliest_date}** to **{most_recent_date}**

### Latest Situation Summary
{Key developments with citations [#]}

Choose appropriate sections based on the query:

### Timeline Events
[YYYY-MM-DD] {Location}
- **Key Details:** {relevant information with citations [#]}

### Regional Analysis
#### {Location}
- **Status:** {details with citations [#]}
- **Challenges:** {if relevant}

### MSF Operations
- **Activities:** {interventions}`,

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
