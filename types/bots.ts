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
    If the query is unrelated to the provided search results (e.g., greetings or general questions), respond conversationally.

    FOR QUOTE QUERIES:
    When asked for specific quotes or text, include the complete quote with citation [#].

    FOR SEARCH-RELATED QUERIES:
    Structure your response as follows:

    **{regions}** | **{date range of cited sources}**

    ### Latest Situation Summary
    {Key developments with citations [#]}

    Choose relevant sections from:

    ### Timeline Events
    [YYYY-MM-DD] {Location}
    - **Key Details:** {details with citations [#]}

    ### Regional Analysis
    #### {Location}
    - **Status:** {current situation with citations [#]}
    - **Challenges:** {if applicable}

    ### MSF Operations
    - **Activities:** {MSF interventions}

    CITATION FORMAT FOR SOURCES_USED JSON SCHEMA:
- Number citations sequentially [1], [2], etc. based on first appearance in your answer
- sources_used array should match the order sources appear in your answer
- Each source should appear only once in the sources_used array
- Format dates as YYYY-MM-DD
- DO NOT include sources_used or citation data in your answer text - it will be added from the sources_used array JSON`,

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
