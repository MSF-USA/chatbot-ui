
import React, { FC, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import {
  TermsData,
  TermsDocument,
  fetchTermsData,
  saveUserAcceptance,
  hasUserAcceptedAllRequiredDocuments
} from '@/lib/utils/app/termsAcceptance';
import { Session } from 'next-auth';
import ReactMarkdown from 'react-markdown';
import {IconLanguage} from "@tabler/icons-react";

interface TermsAcceptanceModalProps {
  user: Session['user'];
  onAcceptance: () => void;
}

export const TermsAcceptanceModal: FC<TermsAcceptanceModalProps> = ({
  user,
  onAcceptance
}) => {
  const t = useTranslations();
  const router = useRouter();
  const userLocale = 'en'; // Default to English for terms

  const [termsData, setTermsData] = useState<TermsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState<Record<string, boolean>>({});
  const [currentDocument, setCurrentDocument] = useState<string>('platformTerms');
  const [currentLocale, setCurrentLocale] = useState<string>(userLocale);
  const [availableLocales, setAvailableLocales] = useState<string[]>(['en']);
  const [allAccepted, setAllAccepted] = useState<boolean>(false);

  // Get user ID
  const userId = user?.id || user?.mail || '';

  // Fetch terms data
  useEffect(() => {
    const getTermsData = async () => {
      try {
        setLoading(true);
        const data = await fetchTermsData();
        setTermsData(data);

        // Initialize acceptance state
        const initialAcceptance: Record<string, boolean> = {};
        Object.keys(data).forEach(key => {
          initialAcceptance[key] = false;
        });
        setAcceptedTerms(initialAcceptance);

        // Determine available locales
        if (data.platformTerms) {
          const locales = Object.keys(data.platformTerms.localized);
          setAvailableLocales(locales);

          // Set initial locale - use user's locale if available, otherwise English
          const userLocaleAvailable = locales.includes(userLocale);
          setCurrentLocale(userLocaleAvailable ? userLocale : 'en');
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching terms data:', error);
        setError('Failed to load terms and conditions. Please try again later.');
        setLoading(false);
      }
    };

    getTermsData();
  }, [userLocale]);

  // Check if all required terms are accepted
  useEffect(() => {
    if (!termsData) return;

    let allRequired = true;
    Object.entries(termsData).forEach(([key, doc]) => {
      if (doc?.required && !acceptedTerms[key]) {
        allRequired = false;
      }
    });

    setAllAccepted(allRequired);
  }, [acceptedTerms, termsData]);

  // Handle acceptance of a document
  const handleAcceptDocument = (documentType: string) => {
    setAcceptedTerms(prev => ({
      ...prev,
      [documentType]: !prev[documentType]
    }));
  };

  // Handle final acceptance of all terms
  const handleAcceptAllTerms = async () => {
    if (!termsData || !userId) return;

    try {
      // Save acceptance for each document
      Object.entries(termsData).forEach(([docType, doc]) => {
        if (acceptedTerms[docType] && doc) {
          const hash = doc.localized[currentLocale]?.hash || doc.localized['en'].hash;
          saveUserAcceptance(userId, docType, doc.version, hash, currentLocale);
        }
      });

      // Call the onAcceptance callback
      onAcceptance();
    } catch (error) {
      console.error('Error saving terms acceptance:', error);
      setError('Failed to save your acceptance. Please try again.');
    }
  };

  // Switch between documents
  const handleSwitchDocument = (documentType: string) => {
    setCurrentDocument(documentType);
  };

  // Handle locale change
  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentLocale(e.target.value);
  };

  // Get localized name for a language
  const getLanguageName = (locale: string): string => {
    const localeNames: Record<string, string> = {
      en: 'English',
      fr: 'Français'
      // Add more as needed
    };
    return localeNames[locale] || locale;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#202123] p-6 rounded-lg shadow-xl max-w-2xl w-full">
          <div className="text-center">
            <p className="text-gray-800 dark:text-white">{t('Loading terms and conditions_ellipsis')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#202123] p-6 rounded-lg shadow-xl max-w-2xl w-full">
          <div className="text-center">
            <p className="text-red-500">{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              {t('Retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!termsData) {
    return null;
  }

  const currentDocumentData = termsData[currentDocument];
  const documentContent = currentDocumentData?.localized[currentLocale]?.content ||
      currentDocumentData?.localized['en']?.content ||
      '';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#202123] p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          {t('Terms and Conditions')}
        </h2>

          {/* Language selector */}
          <div className="flex items-center">
            <label htmlFor="language-select" className="text-gray-700 dark:text-white mr-2">
              <IconLanguage />
            </label>
            <select
                id="language-select"
                value={currentLocale}
                onChange={handleLocaleChange}
                className="bg-gray-100 text-gray-800 dark:bg-[#2a2b32] dark:text-white rounded p-1 border border-gray-300 dark:border-gray-700"
            >
              {availableLocales.map(locale => (
                  <option key={locale} value={locale}>
                    {getLanguageName(locale)}
                  </option>
              ))}
            </select>
          </div>
        </div>

        {/* Document tabs */}
        <div className="flex mb-4 border-b border-gray-300 dark:border-gray-700">
          {Object.entries(termsData).map(([docType, doc]) => (
            <button
              key={docType}
              className={`px-4 py-2 ${
                currentDocument === docType
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
              }`}
              onClick={() => handleSwitchDocument(docType)}
            >
              {docType === 'platformTerms' ? t('Terms of Service') :
              docType === 'privacyPolicy' ? t('Privacy Policy') :
                docType}
              {doc?.required && <span className="ml-1 text-red-500">*</span>}
            </button>
          ))}
        </div>

        {/* Document content */}
        <div className="overflow-y-auto flex-grow mb-4 bg-gray-100 dark:bg-[#2a2b32] p-4 rounded">
          <ReactMarkdown className="prose dark:prose-invert max-w-none">
            {documentContent}
          </ReactMarkdown>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {t('Version')}: {currentDocumentData?.version}
          </div>
        </div>

        {/* Acceptance checkboxes */}
        <div className="mb-4">
          {Object.entries(termsData).map(([docType, doc]) => (
            <div key={docType} className="flex items-center mb-2">
              <input
                type="checkbox"
                id={`accept-${docType}`}
                checked={acceptedTerms[docType]}
                onChange={() => handleAcceptDocument(docType)}
                className="mr-2"
              />
              {/* Temporary implementation with language-specific text */}
              <label htmlFor={`accept-${docType}`} className="text-gray-800 dark:text-white">
                {currentLocale === 'fr' ? 'J\'accepte ' : 'I accept the '}
                {docType === 'platformTerms'
                    ? (currentLocale === 'fr' ? 'Conditions d\'utilisation' : 'Terms of Service')
                    : docType === 'privacyPolicy'
                        ? (currentLocale === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy')
                        : docType} <span className={'font-light'}>v{doc?.version}</span>
                {doc?.required && <span className="ml-1 text-red-500">*</span>}
              </label>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end">
          <button
            className={`px-4 py-2 rounded ${
              allAccepted
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed'
            }`}
            onClick={handleAcceptAllTerms}
            disabled={!allAccepted}
          >
            {t('Accept and Continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAcceptanceModal;
