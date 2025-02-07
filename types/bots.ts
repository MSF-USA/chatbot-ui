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
    - **Activities:** {MSF interventions}`,

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
