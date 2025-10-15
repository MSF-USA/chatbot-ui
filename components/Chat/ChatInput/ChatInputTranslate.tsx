import React, {Dispatch, FC, SetStateAction, useEffect, useRef, useState} from "react";
import { IconLanguage, IconArrowsExchange } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import Modal from "@/components/UI/Modal";

interface ChatInputTranslateProps {
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  handleSend: () => void;
  simulateClick: boolean;
  setParentModalIsOpen: Dispatch<SetStateAction<boolean>>;
  defaultText?: string | null | undefined;
}

const ChatInputTranslate: FC<ChatInputTranslateProps> = (
  {
    setTextFieldValue,
    handleSend,
    simulateClick,
    setParentModalIsOpen,
    defaultText
  }) => {
  const t = useTranslations();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputText, setInputText] = useState(defaultText ?? "");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [translationType, setTranslationType] = useState("balanced");
  const [domainSpecific, setDomainSpecific] = useState("general");
  const [useFormalLanguage, setUseFormalLanguage] = useState(false);
  const [useGenderNeutralLanguage, setUseGenderNeutralLanguage] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
  const [isReadyToSend, setIsReadyToSend] = useState<boolean>(false);
  const [useTargetLanguageDropdown, setUseTargetLanguageDropdown] = useState<boolean>(true);
  const openModalButtonRef = useRef<HTMLButtonElement>(null);
  const inputTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isReadyToSend) {
      setIsReadyToSend(false); // Reset the flag
      handleSend();
      setParentModalIsOpen(false)
    }
  }, [isReadyToSend, handleSend, setParentModalIsOpen]);

  useEffect(() => {
    if (simulateClick && openModalButtonRef.current) {
      openModalButtonRef.current.click();
    }
  }, [simulateClick]);

  const closeModal = () => {
    setIsModalOpen(false);
    setParentModalIsOpen(false);
  };

  const languages = [
    { value: "en", label: t("languageEnglish"), autonym: "English" },
    { value: "es", label: t("languageSpanish"), autonym: "Español" },
    { value: "fr", label: t("languageFrench"), autonym: "Français" },
    { value: "de", label: t("languageGerman"), autonym: "Deutsch" },
    { value: "nl", label: t("languageDutch"), autonym: "Nederlands" },
    { value: "it", label: t("languageItalian"), autonym: "Italiano" },
    { value: "pt", label: t("languagePortuguese"), autonym: "Português" },
    { value: "ru", label: t("languageRussian"), autonym: "Русский" },
    { value: "zh", label: t("languageChinese"), autonym: "中文" },
    { value: "ja", label: t("languageJapanese"), autonym: "日本語" },
    { value: "ko", label: t("languageKorean"), autonym: "한국어" },
    { value: "ar", label: t("languageArabic"), autonym: "العربية" },
    { value: "hi", label: t("languageHindi"), autonym: "हिन्दी" },
  ].sort((a, b) => a.label.localeCompare(b.label));

  const handleTranslate = () => {
    if (!inputText.trim()) {
      toast.error(t('translatorNoTextError'));
      return;
    }
    if (!targetLanguage) {
      toast.error(t('translatorNoTargetLanguageError'));
      return;
    }

    let prompt;
    if (!sourceLanguage) {
      prompt = `Translate the following text into the language with iso code \`${
        languages.find((l) => l.value === targetLanguage)?.value || "unknown"
      }\`:\n\n\`\`\`\n${inputText}\n\`\`\``;
    } else {
      prompt = `Translate the following text from the language with the iso code \`${
        languages.find((l) => l.value === sourceLanguage)?.value || "the original language"
      }\` to \`${
        languages.find((l) => l.value === targetLanguage)?.value || "unknown"
      }\`:\n\n\`\`\`${sourceLanguage}\n${inputText}\n\`\`\``;
    }

    prompt += '\n\nRespond with directly markdown formatted text (not in a code block) matching the original as closely as possible, making only language-appropriate adjustments.';

    // Include advanced options in the prompt if selected
    if (translationType !== "balanced") {
      prompt += `\n\nTranslation type: ${translationType}`;
    } else {
      prompt += '\n\nMake sure your translation balances between literal, figurative, and cultural translations in a way that intuitively captures the original meaning.'
    }
    if (domainSpecific !== "general") {
      prompt += `\nDomain-specific terminology: ${domainSpecific}`;
    }
    if (useFormalLanguage) {
      prompt += `\nPlease use formal language.`;
    }
    if (useGenderNeutralLanguage) {
      prompt += `\nPlease use gender-neutral language.`;
    }

    setTextFieldValue(prompt);
    setIsModalOpen(false);
    setIsReadyToSend(autoSubmit);
    setInputText("");
  };

  const modalContent = (
    <>
      {/* Language selection */}
      <div className="flex items-center gap-3">
        <select
          id="source-language"
          className="flex-1 pl-4 pr-10 py-3 text-base bg-white dark:bg-[#2D3748] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-all"
          value={sourceLanguage}
          onChange={(e) => setSourceLanguage(e.target.value)}
        >
          <option value="" className="text-gray-500 dark:text-gray-400">{t('translatorEmptyFromLanguage')}</option>
          {languages.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label} ({language.autonym})
            </option>
          ))}
        </select>

        <button
          id={'translate-language-swap'}
          onClick={() => {
            const temp = sourceLanguage;
            setSourceLanguage(targetLanguage);
            setTargetLanguage(temp);
          }}
          className="flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          title="Swap languages"
          aria-label="Swap languages"
        >
          <IconArrowsExchange size={20} />
        </button>

        {useTargetLanguageDropdown ? (
          <select
            id="target-language"
            className="flex-1 pl-4 pr-10 py-3 text-base bg-white dark:bg-[#2D3748] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-all"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          >
            <option value="" className="text-gray-500 dark:text-gray-400">{t('translatorEmptyToLanguage')}</option>
            {languages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label} ({language.autonym})
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder="Type a language"
            className="flex-1 pl-4 pr-10 py-3 text-base bg-white dark:bg-[#2D3748] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-all"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          />
        )}
      </div>
      {/* Input text area */}
      <div className="my-6">
        <label
          htmlFor="input-text"
          className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white"
        >
          Enter text to translate
        </label>
        <textarea
          id="input-text"
          ref={inputTextRef}
          rows={6}
          className="block w-full px-4 py-3 bg-white dark:bg-[#2D3748] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
          placeholder={t('translatorTextToTranslatePlaceholder')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        ></textarea>
      </div>
      {/* Advanced options */}
      <div className="my-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          {t('advancedOptionsButton')}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ml-2 transform transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        {showAdvanced && (
          <div className="mt-4 p-5 bg-gray-50 dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* Advanced options content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="translation-type"
                  className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white"
                >
                  {t('translatorTranslationTypeLabel')}
                </label>
                <select
                  id="translation-type"
                  className="block w-full pl-4 pr-10 py-2.5 text-base bg-white dark:bg-[#2D3748] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-all"
                  value={translationType}
                  onChange={(e) => setTranslationType(e.target.value)}
                >
                  <option value="literal">{t('translatorTranslationTypeLiteral')}</option>
                  <option value="balanced">{t('translatorTranslationTypeBalanced')}</option>
                  <option value="figurative">{t('translatorTranslationTypeFigurative')}</option>
                  <option value="cultural">{t('translatorTranslationTypeCultural')}</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="domain-specific"
                  className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white"
                >
                  {t('translatorTranslationDomainLabel')}
                </label>
                <select
                  id="domain-specific"
                  className="block w-full pl-4 pr-10 py-2.5 text-base bg-white dark:bg-[#2D3748] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-all"
                  value={domainSpecific}
                  onChange={(e) => setDomainSpecific(e.target.value)}
                >
                  <option value="general">{t('translatorTranslationDomainGeneral')}</option>
                  <option value="medical">{t('translatorTranslationDomainMedical')}</option>
                  <option value="legal">{t('translatorTranslationDomainLegal')}</option>
                  <option value="technical">{t('translatorTranslationDomainTechnical')}</option>
                  <option value="business">{t('translatorTranslationDomainBusiness')}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-3 sm:space-y-0 mt-5">
              <div className="flex items-center">
                <input
                  id="use-formal-language"
                  type="checkbox"
                  checked={useFormalLanguage}
                  onChange={(e) => setUseFormalLanguage(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded transition-all"
                />
                <label
                  htmlFor="use-formal-language"
                  className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  {t('translatorFormalLanguageLabel')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="use-gender-neutral-language"
                  type="checkbox"
                  checked={useGenderNeutralLanguage}
                  onChange={(e) => setUseGenderNeutralLanguage(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded transition-all"
                />
                <label
                  htmlFor="use-gender-neutral-language"
                  className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  {t('translatorGenderNeutralLabel')}
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Add auto-submit toggle before the Translate button */}
      <div className="flex items-center">
        <input
          id="auto-submit"
          type="checkbox"
          checked={autoSubmit}
          onChange={(e) => setAutoSubmit(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded transition-all"
        />
        <label
          htmlFor="auto-submit"
          className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          {t('autoSubmitButton')}
        </label>
      </div>
    </>
  );

  const modalFooter = (
    <button
      onClick={handleTranslate}
      className="w-full flex justify-center py-3 px-6 text-base font-semibold text-black bg-white hover:bg-gray-100 border border-gray-300 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
    >
      {autoSubmit ? t('translatorTranslateButton') : t('generatePromptButton')}
    </button>
  );

  return (
    <>
      <button
        style={{display: 'none'}}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          setIsModalOpen(true);
        }}
        ref={openModalButtonRef}
      >
        <IconLanguage
          className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700"/>
        <span className="sr-only">Translate text</span>
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        size="lg"
        initialFocusRef={inputTextRef}
        footer={modalFooter}
        closeWithButton={true}
        className="!z-[100]"
      >
        {modalContent}
      </Modal>
    </>
  );
};

export default ChatInputTranslate;