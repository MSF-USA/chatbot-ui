import { IconBuildingBank, IconCopy, IconMail, IconMailForward, IconUsers } from '@tabler/icons-react';
import { FC, useMemo, useState } from 'react';

import { useTranslation } from 'next-i18next';

import {
  FEEDBACK_EMAIL,
  OCG_FEEDBACK_EMAIL,
  US_FEEDBACK_EMAIL,
} from '@/types/contact';

import Modal from '../UI/Modal';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

/**
 * Extracts the domain portion from an email address
 */
const getEmailDomain = (email: string): string => {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : '';
};

/**
 * Checks if email domain matches or is a valid subdomain of allowed domain
 * Prevents superdomain attacks (e.g., newyork.msf.org.attacker.com)
 */
const isDomainMatch = (email: string, allowedDomain: string): boolean => {
  const domain = getEmailDomain(email.toLowerCase());
  if (!domain) return false;

  // Exact match (e.g., newyork.msf.org)
  if (domain === allowedDomain) return true;

  // Valid subdomain match (e.g., mail.newyork.msf.org)
  // Only matches if domain ends with ".allowedDomain" to prevent superdomain attacks
  return domain.endsWith('.' + allowedDomain);
};

/**
 * Determines the recommended support option based on user email domain
 */
const getRecommendedOptionId = (email?: string): string => {
  if (!email) return 'field-staff';

  if (isDomainMatch(email, 'newyork.msf.org')) return 'msf-usa';
  if (isDomainMatch(email, 'amsterdam.msf.org')) return 'oca-hq';
  if (isDomainMatch(email, 'geneva.msf.org')) return 'ocg-hq';

  return 'field-staff';
};

/**
 * Fisher-Yates shuffle algorithm for randomizing array
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * SupportModal component displays organization-specific support options
 * for MSF staff members.
 *
 * Provides four support pathways:
 * - MSF USA: Direct email to New York office
 * - OCA HQ: Direct email to Amsterdam headquarters
 * - OCG HQ: Direct email to Geneva headquarters
 * - Field Staff/Other: Guidance to contact local IT first
 *
 * Automatically recommends the appropriate option based on user email domain.
 *
 * @param isOpen - Controls modal visibility
 * @param onClose - Callback function to close the modal
 * @param userEmail - User's email address for smart recommendations
 */
export const SupportModal: FC<SupportModalProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  const { t } = useTranslation('support');

  // Determine recommended option based on email
  const recommendedId = useMemo(
    () => getRecommendedOptionId(userEmail),
    [userEmail],
  );

  const [expandedOption, setExpandedOption] = useState<string | null>(recommendedId);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleOptionClick = (optionId: string) => {
    setExpandedOption(expandedOption === optionId ? null : optionId);
  };

  const handleCopyEmail = async (email: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  const handleMailtoClick = (email: string, event: React.MouseEvent) => {
    event.stopPropagation();
    window.location.href = `mailto:${email}`;
  };

  // Define all support options
  const allOptions = useMemo(
    () => [
      {
        id: 'msf-usa',
        title: t('MSF USA'),
        email: US_FEEDBACK_EMAIL,
        icon: <IconBuildingBank size={24} />,
        color: 'blue',
      },
      {
        id: 'oca-hq',
        title: t('OCA HQ'),
        email: FEEDBACK_EMAIL,
        icon: <IconBuildingBank size={24} />,
        color: 'green',
      },
      {
        id: 'ocg-hq',
        title: t('OCG HQ'),
        email: OCG_FEEDBACK_EMAIL,
        icon: <IconBuildingBank size={24} />,
        color: 'purple',
      },
      {
        id: 'field-staff',
        title: t('Field Staff / Other'),
        icon: <IconUsers size={24} />,
        color: 'orange',
        isFieldStaff: true,
      },
    ],
    [t],
  );

  // Order options: recommended first, then randomized others
  const orderedOptions = useMemo(() => {
    const recommended = allOptions.find((opt) => opt.id === recommendedId);
    const others = allOptions.filter((opt) => opt.id !== recommendedId);
    const shuffledOthers = shuffleArray(others);

    return recommended ? [recommended, ...shuffledOthers] : shuffledOthers;
  }, [allOptions, recommendedId]);

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { border: string; text: string; bg: string; hover: string }> = {
      blue: {
        border: 'border-blue-500 dark:border-blue-400',
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      },
      green: {
        border: 'border-green-500 dark:border-green-400',
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      },
      purple: {
        border: 'border-purple-500 dark:border-purple-400',
        text: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
      },
      orange: {
        border: 'border-orange-500 dark:border-orange-400',
        text: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
      },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('Support')}
      size="lg"
      showCloseButton={true}
    >
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {t('Choose Your Organization')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('Select your organization to get the right support contact')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orderedOptions.map((option) => {
            const colors = getColorClasses(option.color);
            const isExpanded = expandedOption === option.id;
            const isRecommended = option.id === recommendedId;

            return (
              <div key={option.id} className="w-full">
                <button
                  onClick={() => handleOptionClick(option.id)}
                  className={`relative w-full p-4 rounded-lg transition-all ${colors.border} ${colors.bg} ${colors.hover} text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${option.color}-500 ${
                    isExpanded ? 'border-4 shadow-lg scale-[1.02]' : 'border-2'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Recommended
                      </span>
                    </div>
                  )}
                  <div className="flex items-start space-x-3">
                    <div className={colors.text}>{option.icon}</div>
                    <div className="flex-1 min-w-0 pr-20">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {option.title}
                      </h3>
                      {option.email && (
                        <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <IconMail size={14} className="mr-1" />
                          <span className="truncate">{option.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Dedicated expansion zone below grid */}
        {expandedOption && (() => {
          const selectedOption = allOptions.find(opt => opt.id === expandedOption);
          if (!selectedOption) return null;

          const colors = getColorClasses(selectedOption.color);

          return (
            <div className={`mt-6 p-6 rounded-lg border-2 transition-all animate-in slide-in-from-top duration-300 ${colors.bg} ${colors.border}`}>
              {selectedOption.email ? (
                // Email organization expansion
                <div className="flex flex-col space-y-4">
                  {/* Email address with scrolling animation (mobile only) */}
                  <div className="overflow-hidden md:overflow-visible">
                    <div className="animate-scroll-text-auto md:animate-none">
                      <p className="text-base font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {selectedOption.email}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => handleCopyEmail(selectedOption.email!, e)}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md transition-all ${colors.text} ${colors.bg} hover:brightness-95 dark:hover:brightness-110 border-2 ${colors.border} font-medium`}
                      title="Copy email to clipboard"
                    >
                      <IconCopy size={20} />
                      <span className="text-sm">
                        {copiedEmail === selectedOption.email ? 'Copied!' : 'Copy Email'}
                      </span>
                    </button>

                    <button
                      onClick={(e) => handleMailtoClick(selectedOption.email!, e)}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md transition-all ${colors.text} ${colors.bg} hover:brightness-95 dark:hover:brightness-110 border-2 ${colors.border} font-medium`}
                      title="Open email client"
                    >
                      <IconMailForward size={20} />
                      <span className="text-sm">Send Email</span>
                    </button>
                  </div>
                </div>
              ) : selectedOption.isFieldStaff ? (
                // Field staff expansion
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {t('Field Staff Message')}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })()}

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors font-medium"
          >
            {t('Close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
