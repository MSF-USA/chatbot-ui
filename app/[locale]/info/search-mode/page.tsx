import {
  IconAlertCircle,
  IconArrowLeft,
  IconInfoCircle,
  IconShield,
  IconWorld,
} from '@tabler/icons-react';

import Link from 'next/link';

import { AzureAIIcon } from '@/components/Icons/providers';
import { MermaidDiagram } from '@/components/UI/MermaidDiagram';

export default function SearchModeInfoPage() {
  // Mermaid diagram for Privacy-Focused Mode - User-focused flowchart
  const privacyModeDiagram = `
    flowchart TD
      Start([👤 You send a message]) --> Browser[💾 Your Browser<br/>Full conversation stored locally]
      Browser --> Backend[🔄 AI Assistant Backend]
      Backend --> Analyze{🔍 Need web search?}

      Analyze -->|Yes| CreateQuery[📝 Create search query<br/>Only query, not full conversation]
      Analyze -->|No| DirectResponse[🤖 Azure OpenAI<br/>Stateless - forgets after]

      CreateQuery --> Foundry[☁️ Azure AI Foundry<br/>Stores: Search query + thread ID]
      Foundry --> SearchResults[🌐 Web search results]
      SearchResults --> Response[🤖 Azure OpenAI<br/>Stateless - forgets after]
      DirectResponse --> Final
      Response --> Final[💬 Response to you]
      Final --> Browser

      style Browser fill:#d4edda,stroke:#28a745,stroke-width:2px
      style Foundry fill:#fff3cd,stroke:#ffc107,stroke-width:2px
      style DirectResponse fill:#e7f3ff,stroke:#0066cc,stroke-width:2px
      style Response fill:#e7f3ff,stroke:#0066cc,stroke-width:2px
      style Final fill:#d4edda,stroke:#28a745,stroke-width:2px
  `;

  // Mermaid diagram for Azure AI Foundry Mode - User-focused flowchart
  const foundryModeDiagram = `
    flowchart TD
      Start([👤 You send a message]) --> Browser[💾 Your Browser<br/>Full conversation stored locally]
      Browser --> Backend[🔄 AI Assistant Backend]
      Backend --> Foundry[☁️ Azure AI Foundry Agent<br/>⚠️ Stores full conversation via thread ID]

      Foundry --> HasContext[📚 Agent recalls full conversation<br/>from thread storage]
      HasContext --> SearchCheck{🔍 Need web search?}

      SearchCheck -->|Yes| Search[🌐 Web search<br/>executed internally]
      SearchCheck -->|No| Generate[🤖 Generate response]

      Search --> Generate
      Generate --> Stream[💬 Streaming response to you]
      Stream --> Browser
      Stream --> Store[💾 Response saved in<br/>both browser AND Foundry]

      style Browser fill:#d4edda,stroke:#28a745,stroke-width:2px
      style Foundry fill:#f8d7da,stroke:#dc3545,stroke-width:3px
      style Store fill:#f8d7da,stroke:#dc3545,stroke-width:2px
      style Stream fill:#d4edda,stroke:#28a745,stroke-width:2px
  `;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <IconArrowLeft size={16} />
        Back to Chat
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <IconWorld size={32} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Search Mode Explained
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          How web search works and where your data is stored
        </p>
      </div>

      {/* Important Notice */}
      <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <IconAlertCircle
            size={24}
            className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          />
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Current Search Implementation
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              The AI Assistant team is actively looking for more privacy-focused
              internet search options. The current implementation uses Azure AI
              Foundry's search capabilities because{' '}
              <a
                href="https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Azure deprecated their Bing Search API
              </a>{' '}
              that the system was originally relying on.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Until a more privacy-preserving solution is implemented, you have
              two options for how search requests are handled, each with
              different privacy and performance trade-offs.
            </p>
          </div>
        </div>
      </div>

      {/* Option 1: Privacy-Focused Mode */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <IconShield
            size={28}
            className="text-green-600 dark:text-green-400"
          />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Privacy-Focused Mode (Default)
          </h2>
        </div>

        {/* Workflow Diagram */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4 overflow-x-auto">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            How Your Data Flows:
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            🟢 Green = Your data stays in your browser | 🟡 Yellow = Only search
            queries stored | 🔵 Blue = Stateless (no memory)
          </p>
          <MermaidDiagram
            chart={privacyModeDiagram}
            className="flex justify-center"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            In Simple Terms:
          </h3>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 mb-6">
            <p className="flex gap-2">
              <span>💾</span>
              <span>
                Your full conversation lives only in your browser - nowhere else
                can access it
              </span>
            </p>
            <p className="flex gap-2">
              <span>🔍</span>
              <span>
                When you need a web search, we only send the search question to
                Azure - not your whole conversation
              </span>
            </p>
            <p className="flex gap-2">
              <span>🤖</span>
              <span>
                AI models process your messages but don't remember them
                afterward (stateless)
              </span>
            </p>
            <p className="flex gap-2">
              <span>⚡</span>
              <span>
                Takes a bit longer because of multiple steps, but keeps your
                data more private
              </span>
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              What's protected:
            </h4>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2">
                <span className="text-green-600 dark:text-green-400">•</span>
                <span>
                  Conversation stored only in your browser (local storage)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 dark:text-green-400">•</span>
                <span>
                  Azure OpenAI is stateless - doesn't remember your conversation
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 dark:text-green-400">•</span>
                <span>
                  Only search queries (not full conversation) go to Azure AI
                  Foundry
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400">!</span>
              What's stored in Azure AI Foundry:
            </h4>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2">
                <span className="text-amber-600 dark:text-amber-400">•</span>
                <span>
                  Search queries with thread ID (for search execution)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600 dark:text-amber-400">•</span>
                <span>Search results</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-600 dark:text-amber-400">•</span>
                <span>NOT your full conversation history</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Trade-off:
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Multiple API calls (OpenAI for analysis, Foundry for search, OpenAI
            for response) means <strong>slower response times</strong> but
            better privacy.
          </p>
        </div>
      </div>

      {/* Option 2: Azure AI Foundry Mode */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <AzureAIIcon className="w-7 h-7" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Azure AI Foundry Mode
          </h2>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
            GPT-4.1 only
          </span>
        </div>

        {/* Workflow Diagram */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4 overflow-x-auto">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            How Your Data Flows:
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            🟢 Green = Your data in your browser | 🔴 Red = Full conversation
            stored in cloud
          </p>
          <MermaidDiagram
            chart={foundryModeDiagram}
            className="flex justify-center"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            In Simple Terms:
          </h3>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 mb-6">
            <p className="flex gap-2">
              <span>💾</span>
              <span>
                Your conversation is saved in your browser AND in Azure AI
                Foundry (using a thread ID)
              </span>
            </p>
            <p className="flex gap-2">
              <span>☁️</span>
              <span>
                Azure AI Foundry remembers your whole conversation - you only
                send new messages, it recalls the rest
              </span>
            </p>
            <p className="flex gap-2">
              <span>🌐</span>
              <span>
                Web searches happen instantly inside Azure - no extra
                back-and-forth
              </span>
            </p>
            <p className="flex gap-2">
              <span>⚡</span>
              <span>
                Much faster responses, but your full conversation stays in Azure
                cloud storage
              </span>
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">✓</span>
              What's faster:
            </h4>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>
                  Single-step process (direct routing to Foundry agent)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>
                  Agent has full context via thread ID (no need to resend
                  history)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>More efficient tool execution</span>
              </li>
            </ul>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400">⚠</span>
              What's stored in Azure AI Foundry:
            </h4>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400">•</span>
                <span>
                  <strong>Your entire conversation history</strong> (stored by
                  thread ID)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400">•</span>
                <span>All messages you've sent in that conversation</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400">•</span>
                <span>All AI responses generated</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600 dark:text-red-400">•</span>
                <span>Any search queries and results</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-808">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Trade-off:
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Faster responses but <strong>less privacy</strong>. Your full
            conversation data is stored in Azure AI Foundry systems (using
            thread IDs), not just in your browser.
          </p>
        </div>
      </div>

      {/* Comparison */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Side-by-Side Comparison
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"></th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                  <div className="flex items-center justify-center gap-2">
                    <IconShield
                      size={16}
                      className="text-green-600 dark:text-green-400"
                    />
                    Privacy-Focused
                  </div>
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                  <div className="flex items-center justify-center gap-2">
                    <AzureAIIcon className="w-4 h-4" />
                    Azure AI Foundry
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50">
                  Response Speed
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-amber-600 dark:text-amber-400">
                  Slower (multi-step)
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">
                  Faster (direct)
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50">
                  Conversation Stored in Azure AI Foundry
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-green-600 dark:text-green-400 font-semibold">
                  No
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-red-600 dark:text-red-400 font-semibold">
                  Yes (via thread ID)
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50">
                  What's in Azure AI Foundry
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  Search queries only
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  Full conversation + all messages
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50">
                  Conversation always in browser
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-green-600 dark:text-green-400 font-semibold">
                  Yes
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-green-600 dark:text-green-400 font-semibold">
                  Yes
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50">
                  Model Availability
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                  All models
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                  GPT-4.1 only
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <p className="mb-2">
          <strong>Note:</strong> Both modes store your conversation locally in
          your browser. Both use Microsoft Azure infrastructure.
        </p>
        <p>
          You can change search modes anytime in the model settings dropdown.
        </p>
      </div>
    </div>
  );
}
