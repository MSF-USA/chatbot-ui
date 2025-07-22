/**
 * Privacy Policy Display Component
 * 
 * Displays the privacy policy content in a user-friendly format
 * with support for multiple languages.
 */

import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import {
  IconShield,
  IconLanguage,
  IconInfoCircle,
  IconDatabase,
  IconLock,
  IconAlertTriangle,
  IconCheck,
  IconSearch,
  IconEye,
} from '@tabler/icons-react';

import privacyPolicyData from '@/utils/knowledge/privacyPolicy.json';

/**
 * Component props
 */
interface PrivacyControlSectionProps {
  onClose: () => void;
}

/**
 * French translations for the privacy policy
 */
const frenchTranslations: Record<string, { question: string; answer: string }> = {
  privacy_001: {
    question: "Qu'est-ce que l'Assistant IA MSF et comment protège-t-il la vie privée ?",
    answer: "L'Assistant IA MSF est un chatbot IA interne développé pour le personnel de MSF. Il utilise les grands modèles de langage Open AI de Microsoft Azure tout en conservant toutes les données au sein de MSF, garantissant la confidentialité et le contrôle. L'utilisation d'ai.msf.org est un environnement plus sûr et plus sécurisé que l'utilisation d'autres outils IA externes gratuits, qui offrent très peu de garanties de confidentialité."
  },
  privacy_002: {
    question: "Où mes données sont-elles stockées et traitées ?",
    answer: "Toutes les données de conversation avec l'Assistant IA MSF sont stockées localement sur votre propre ordinateur et traitées dans les systèmes MSF en utilisant l'infrastructure Microsoft Azure. Vos informations de connexion seront traitées par MSF comme indiqué dans la politique de confidentialité de votre entité MSF. Les données sont conservées au sein de MSF, garantissant la confidentialité et le contrôle."
  },
  privacy_003: {
    question: "Quelles données ne dois-je PAS mettre dans l'Assistant IA MSF ?",
    answer: "Vous ne devez PAS mettre dans ai.msf.org les informations suivantes :\n- Données personnelles (noms, numéros de téléphone, CV, témoignages ; tout ce qui peut identifier directement ou indirectement un individu -- cela inclut une combinaison de données qui ensemble peuvent permettre d'identifier un individu)\n- Données hautement sensibles (données qui peuvent être utilisées intentionnellement ou non pour nuire aux individus, aux communautés, à MSF ou à son personnel -- déterminer la sensibilité des données nécessite d'incorporer une analyse du contexte, par exemple les emplacements de projets sensibles ou de groupes à risque, les incidents de sécurité et autres détails opérationnels)"
  },
  privacy_004: {
    question: "Quelles sont les directives d'utilisation responsable de l'Assistant IA MSF ?",
    answer: "Vous acceptez d'utiliser ai.msf.org de manière responsable. Vous devez :\n- L'utiliser conformément aux politiques TIC, IA et autres politiques applicables de vos entités MSF\n- Toujours vérifier l'exactitude, l'inclusivité et les biais des résultats\n- Vérifier que les résultats n'enfreignent pas les droits de propriété intellectuelle de tiers\n- Être transparent sur votre utilisation de l'IA et marquer les résultats comme générés par l'IA"
  },
  privacy_005: {
    question: "Quelles sont les utilisations interdites de l'Assistant IA MSF ?",
    answer: "Vous ne devez PAS utiliser ai.msf.org aux fins suivantes :\n- Soins de santé (pour fournir des soins de santé ou répondre à des questions liées à la santé)\n- Surveillance ou suivi des patients MSF, des communautés ou de tout autre individu\n- Décisions liées à l'emploi (pour aider ou remplacer les décisions liées à l'emploi)\n- Prise de décision automatisée (pour prendre des décisions qui pourraient être préjudiciables à un individu ou une communauté)\n- Création de contenu médiatique pour des communications externes sur des questions d'intérêt public\n- Activités illégales ou nuisibles"
  },
  privacy_006: {
    question: "Quelle est la précision des résultats de l'Assistant IA MSF ?",
    answer: "Ai.msf.org utilise une technologie expérimentale -- il ne donne aucune garantie que les résultats seront exacts. De plus, la technologie n'a pas été formée en utilisant des données représentatives des patients et des communautés MSF. Les résultats de l'IA peuvent perpétuer les biais, la discrimination et les stéréotypes. Vous êtes responsable de vérifier les résultats produits."
  },
  privacy_007: {
    question: "Qui dois-je contacter pour des préoccupations de confidentialité ou des incidents ?",
    answer: "Si vous avez des préoccupations ou souhaitez signaler un incident, veuillez contacter : ai.team@amsterdam.msf.org. Pour des régions spécifiques, vous pouvez également contacter votre DPO local (Délégué à la Protection des Données) ou l'équipe TIC responsable."
  },
  privacy_008: {
    question: "Les conditions d'utilisation peuvent-elles être modifiées ?",
    answer: "Ces conditions peuvent être modifiées à tout moment par MSF -- nous vous informerons si nous les modifions -- votre utilisation continue d'ai.msf.org constitue l'acceptation de tout changement."
  }
};

/**
 * Get icon for category
 */
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'overview':
      return <IconInfoCircle className="h-5 w-5" />;
    case 'data_storage':
      return <IconDatabase className="h-5 w-5" />;
    case 'prohibited_data':
      return <IconAlertTriangle className="h-5 w-5" />;
    case 'responsible_use':
      return <IconCheck className="h-5 w-5" />;
    case 'prohibited_uses':
      return <IconLock className="h-5 w-5" />;
    case 'accuracy':
      return <IconEye className="h-5 w-5" />;
    case 'support':
      return <IconShield className="h-5 w-5" />;
    case 'terms_updates':
      return <IconInfoCircle className="h-5 w-5" />;
    default:
      return <IconInfoCircle className="h-5 w-5" />;
  }
};

/**
 * Get category display name
 */
const getCategoryName = (category: string, locale: string) => {
  const names: Record<string, { en: string; fr: string }> = {
    overview: { en: 'Overview', fr: 'Aperçu' },
    data_storage: { en: 'Data Storage', fr: 'Stockage des données' },
    prohibited_data: { en: 'Prohibited Data', fr: 'Données interdites' },
    responsible_use: { en: 'Responsible Use', fr: 'Utilisation responsable' },
    prohibited_uses: { en: 'Prohibited Uses', fr: 'Utilisations interdites' },
    accuracy: { en: 'Accuracy', fr: 'Précision' },
    support: { en: 'Support', fr: 'Support' },
    terms_updates: { en: 'Terms Updates', fr: 'Mises à jour des conditions' }
  };
  return names[category]?.[locale as 'en' | 'fr'] || category;
};

/**
 * Main Privacy Control Section Component
 */
export const PrivacyControlSection: React.FC<PrivacyControlSectionProps> = ({ onClose }) => {
  const { t } = useTranslation(['settings', 'privacy']);
  const [currentLocale, setCurrentLocale] = useState<'en' | 'fr'>('en');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter policy items based on search
  const filteredItems = privacyPolicyData.items.filter(item => {
    const question = currentLocale === 'fr' && frenchTranslations[item.id] 
      ? frenchTranslations[item.id].question 
      : item.question;
    const answer = currentLocale === 'fr' && frenchTranslations[item.id] 
      ? frenchTranslations[item.id].answer 
      : item.answer;
    
    const searchLower = searchQuery.toLowerCase();
    return question.toLowerCase().includes(searchLower) || 
           answer.toLowerCase().includes(searchLower) ||
           item.keywords.some(keyword => keyword.toLowerCase().includes(searchLower));
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {currentLocale === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {currentLocale === 'fr' 
                ? "Toutes les données sont stockées localement sur votre ordinateur."
                : "All data is stored locally on your computer."}
            </p>
          </div>
          
          {/* Language selector */}
          <div className="flex items-center">
            <IconLanguage className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            <select
              value={currentLocale}
              onChange={(e) => setCurrentLocale(e.target.value as 'en' | 'fr')}
              className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white rounded px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={currentLocale === 'fr' ? 'Rechercher dans la politique...' : 'Search privacy policy...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Privacy policy content */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {filteredItems.map((item) => {
          const question = currentLocale === 'fr' && frenchTranslations[item.id] 
            ? frenchTranslations[item.id].question 
            : item.question;
          const answer = currentLocale === 'fr' && frenchTranslations[item.id] 
            ? frenchTranslations[item.id].answer 
            : item.answer;

          return (
            <div key={item.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <div className="text-blue-500 dark:text-blue-400 mt-1">
                  {getCategoryIcon(item.category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {question}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                      {getCategoryName(item.category, currentLocale)}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentLocale === 'fr' 
              ? `Version ${privacyPolicyData.version} • Dernière mise à jour : ${privacyPolicyData.lastUpdated}`
              : `Version ${privacyPolicyData.version} • Last updated: ${privacyPolicyData.lastUpdated}`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {currentLocale === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};