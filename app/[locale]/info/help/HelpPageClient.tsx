'use client';

import {
  IconAlertCircle,
  IconArrowLeft,
  IconChevronDown,
  IconFileText,
  IconHelp,
  IconMail,
  IconSearch,
  IconShield,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import Link from 'next/link';

import faqData from '@/lib/data/faq.json';
import privacyData from '@/lib/data/privacyPolicy.json';

type TabType = 'faq' | 'privacy' | 'terms';

interface HelpPageClientProps {
  isUSUser: boolean;
  supportEmail: string;
}

export function HelpPageClient({
  isUSUser,
  supportEmail,
}: HelpPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const faqs = faqData.faq;
  const privacyItems = privacyData.items;

  // Filter content based on search
  const filteredFaqs = useMemo(() => {
    if (!searchQuery) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query),
    );
  }, [searchQuery, faqs]);

  const filteredPrivacy = useMemo(() => {
    if (!searchQuery) return privacyItems;
    const query = searchQuery.toLowerCase();
    return privacyItems.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query),
    );
  }, [searchQuery, privacyItems]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const tabs = [
    {
      id: 'faq' as TabType,
      label: 'FAQs',
      icon: IconHelp,
      count: filteredFaqs.length,
    },
    {
      id: 'privacy' as TabType,
      label: 'Privacy & Data',
      icon: IconShield,
      count: filteredPrivacy.length,
    },
    ...(isUSUser
      ? []
      : [
          { id: 'terms' as TabType, label: 'Terms of Use', icon: IconFileText },
        ]),
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#212121] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors mb-6"
          >
            <IconArrowLeft size={18} />
            Back to Chat
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <IconHelp
                size={28}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Help Center
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Everything you need to know about AI Assistant
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <IconSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all text-sm shadow-sm"
            />
          </div>

          {/* Search Results Indicator */}
          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {activeTab === 'faq' && (
                <span>
                  Found {filteredFaqs.length}{' '}
                  {filteredFaqs.length === 1 ? 'result' : 'results'}
                </span>
              )}
              {activeTab === 'privacy' && (
                <span>
                  Found {filteredPrivacy.length}{' '}
                  {filteredPrivacy.length === 1 ? 'result' : 'results'}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 mb-6 shadow-sm">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery(''); // Clear search when switching tabs
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all whitespace-nowrap text-sm
                    ${
                      isActive
                        ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-sm'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`
                      px-2 py-0.5 rounded-full text-xs font-semibold
                      ${isActive ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}
                    `}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <IconSearch
                    className="mx-auto mb-4 text-gray-400"
                    size={48}
                  />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    No FAQs match your search
                  </p>
                </div>
              ) : (
                filteredFaqs.map((faq, index) => {
                  const itemId = `faq-${index}`;
                  const isOpen = openItems.has(itemId);
                  return (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="font-medium text-left text-gray-900 dark:text-white pr-4 text-sm">
                          {faq.question}
                        </span>
                        <IconChevronDown
                          size={18}
                          className={`text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3 pt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line border-t border-gray-200 dark:border-gray-700">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-3">
              {filteredPrivacy.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <IconSearch
                    className="mx-auto mb-4 text-gray-400"
                    size={48}
                  />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    No privacy information matches your search
                  </p>
                </div>
              ) : (
                <>
                  {/* Privacy Notice */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <IconShield
                        className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                        size={24}
                      />
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                          Your Privacy Matters
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          All conversations are stored locally on your device.
                          Data processing happens within MSF systems using Azure
                          infrastructure.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 dark:text-green-400">
                              ✓
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              Local storage only
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 dark:text-green-400">
                              ✓
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              MSF-controlled infrastructure
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 dark:text-red-400">
                              ✗
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              No personal data
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 dark:text-red-400">
                              ✗
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              No sensitive operations
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {filteredPrivacy.map((item) => {
                    const isOpen = openItems.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="font-medium text-left text-gray-900 dark:text-white pr-4 text-sm">
                            {item.question}
                          </span>
                          <IconChevronDown
                            size={18}
                            className={`text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3 pt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line border-t border-gray-200 dark:border-gray-700">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Terms Tab */}
          {activeTab === 'terms' && !isUSUser && (
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="max-w-none">
                  <div className="flex items-center gap-3 mb-4">
                    <IconFileText
                      size={24}
                      className="text-blue-600 dark:text-blue-400"
                    />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      ai.msf.org Terms of Use
                    </h2>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    The MSF AI Assistant is an internal AI chatbot developed for
                    MSF staff. It uses Microsoft Azure's Open AI large language
                    models while keeping all data within MSF, ensuring privacy
                    and control.
                  </p>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    By using ai.msf.org, you agree with the following terms and
                    conditions:
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-800">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <IconAlertCircle
                        size={18}
                        className="text-blue-600 dark:text-blue-400"
                      />
                      Responsible Use
                    </h3>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      You agree you will use ai.msf.org responsibly. You will:
                    </p>

                    <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                          •
                        </span>
                        <span>
                          Use it in accordance with your MSF entities'
                          applicable ICT, AI and other policies
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                          •
                        </span>
                        <span>
                          Always check outputs for accuracy, inclusivity and
                          bias
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                          •
                        </span>
                        <span>
                          Check outputs don't infringe third party intellectual
                          property rights
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                          •
                        </span>
                        <span>
                          Be transparent about your AI use and mark outputs as
                          AI-generated
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4 border border-red-200 dark:border-red-800">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                      Prohibited Uses
                    </h3>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
                      You will NOT use ai.msf.org for:
                    </p>

                    <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">
                          ✗
                        </span>
                        <span>
                          <strong>Health care</strong> (to provide healthcare or
                          answer health-related questions)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">
                          ✗
                        </span>
                        <span>
                          <strong>Surveillance or monitoring</strong> of MSF
                          patients or communities
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">
                          ✗
                        </span>
                        <span>
                          <strong>Employment-related decisions</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">
                          ✗
                        </span>
                        <span>
                          <strong>Automated decision-making</strong> that could
                          harm individuals or communities
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">
                          ✗
                        </span>
                        <span>
                          <strong>Creating media content</strong> for external
                          communications on matters of public interest
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">
                          ✗
                        </span>
                        <span>
                          <strong>Illegal or harmful activities</strong>
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4 border border-amber-200 dark:border-amber-800">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                      Data Privacy
                    </h3>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
                      You will NOT put into ai.msf.org:
                    </p>

                    <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">
                          !
                        </span>
                        <span>
                          <strong>Personal data</strong> (names, phone numbers,
                          CVs, testimonies; anything which can directly or
                          indirectly identify an individual)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">
                          !
                        </span>
                        <span>
                          <strong>Highly sensitive data</strong> (data that can
                          be used to harm individuals, communities, MSF or its
                          staff)
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <p className="mb-2">
                      These terms can be modified at any time by MSF. We'll
                      provide notice to you if we change them.
                    </p>
                    <p>
                      Your continued use of ai.msf.org constitutes acceptance of
                      any changes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact Support Card */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <IconMail
                className="text-blue-600 dark:text-blue-400"
                size={24}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Need More Help?
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Our support team is here to assist you with any questions or
                concerns.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors group"
                >
                  <IconMail
                    className="text-blue-600 dark:text-blue-400 flex-shrink-0"
                    size={18}
                  />
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      General Support
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                      {supportEmail}
                    </div>
                  </div>
                </a>
                {!isUSUser && (
                  <a
                    href="mailto:ai.team@amsterdam.msf.org"
                    className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors group"
                  >
                    <IconShield
                      className="text-green-600 dark:text-green-400 flex-shrink-0"
                      size={18}
                    />
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Privacy & Incidents
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        ai.team@amsterdam.msf.org
                      </div>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
