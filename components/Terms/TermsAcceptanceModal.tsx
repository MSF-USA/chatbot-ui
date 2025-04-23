import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import {
  TermsData,
  TermsDocument,
  fetchTermsData,
  saveUserAcceptance,
  hasUserAcceptedAllRequiredDocuments
} from '@/utils/app/termsAcceptance';
import { Session } from 'next-auth';
import ReactMarkdown from 'react-markdown';

interface TermsAcceptanceModalProps {
  user: Session['user'];
  onAcceptance: () => void;
}

export const TermsAcceptanceModal: FC<TermsAcceptanceModalProps> = ({
  user,
  onAcceptance
}) => {
  const { t } = useTranslation('common');
  const [termsData, setTermsData] = useState<TermsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState<Record<string, boolean>>({});
  const [currentDocument, setCurrentDocument] = useState<string>('platformTerms');
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

        setLoading(false);
      } catch (error) {
        console.error('Error fetching terms data:', error);
        setError('Failed to load terms and conditions. Please try again later.');
        setLoading(false);
      }
    };

    getTermsData();
  }, []);

  // Check if all required terms are accepted
  useEffect(() => {
    if (!termsData) return;

    let allRequired = true;
    Object.entries(termsData).forEach(([key, doc]) => {
      if (doc.required && !acceptedTerms[key]) {
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
        if (acceptedTerms[docType]) {
          saveUserAcceptance(userId, docType, doc.version, doc.hash);
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

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-[#202123] p-6 rounded-lg shadow-xl max-w-2xl w-full">
          <div className="text-center">
            <p className="text-white">{t('Loading terms and conditions...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-[#202123] p-6 rounded-lg shadow-xl max-w-2xl w-full">
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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-[#202123] p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4">
          {t('Terms and Conditions')}
        </h2>

        {/* Document tabs */}
        <div className="flex mb-4 border-b border-gray-700">
          {Object.entries(termsData).map(([docType, doc]) => (
            <button
              key={docType}
              className={`px-4 py-2 ${
                currentDocument === docType
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => handleSwitchDocument(docType)}
            >
              {docType === 'platformTerms' ? t('Terms of Service') :
               docType === 'privacyPolicy' ? t('Privacy Policy') :
               docType}
              {doc.required && <span className="ml-1 text-red-500">*</span>}
            </button>
          ))}
        </div>

        {/* Document content */}
        <div className="overflow-y-auto flex-grow mb-4 bg-[#2a2b32] p-4 rounded">
          <ReactMarkdown className="prose prose-invert max-w-none">
            {currentDocumentData.content}
          </ReactMarkdown>
          <div className="text-sm text-gray-400 mt-4">
            {t('Version')}: {currentDocumentData.version}
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
              <label htmlFor={`accept-${docType}`} className="text-white">
                {t('I accept the')} {docType === 'platformTerms' ? t('Terms of Service') :
                                    docType === 'privacyPolicy' ? t('Privacy Policy') :
                                    docType}
                {doc.required && <span className="ml-1 text-red-500">*</span>}
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
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
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
