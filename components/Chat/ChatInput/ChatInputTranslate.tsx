import { FC } from "preact/compat";
import React, {Dispatch, SetStateAction, useEffect, useState} from "react";
import { IconLanguage } from "@tabler/icons-react";
import toast from "react-hot-toast";
import BetaBadge from "@/components/Beta/Badge";

interface ChatInputTranslateProps {
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  handleSend: () => void;
}

const ChatInputTranslate: FC<ChatInputTranslateProps> = (
  {
    setTextFieldValue,
    handleSend
  }) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [translationType, setTranslationType] = useState("balanced");
  const [domainSpecific, setDomainSpecific] = useState("general");
  const [useFormalLanguage, setUseFormalLanguage] = useState(false);
  const [useGenderNeutralLanguage, setUseGenderNeutralLanguage] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
  const [isReadyToSend, setIsReadyToSend] = useState<boolean>(false);

  useEffect(() => {
    if (isReadyToSend) {
      setIsReadyToSend(false); // Reset the flag
      handleSend();
    }
  }, [isReadyToSend, handleSend]);


  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "nl", label: "Dutch" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "ru", label: "Russian" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
    { value: "ar", label: "Arabic" },
    { value: "hi", label: "Hindi" },
  ].sort((a, b) => a.label.localeCompare(b.label));

  const handleTranslate = () => {
    if (!inputText.trim()) {
      toast.error("Please enter text to translate.");
      return;
    }
    if (!targetLanguage) {
      toast.error("Please select a target language.");
      return;
    }

    let prompt;
    if (!sourceLanguage) {
      prompt = `Translate the following text to ${
        languages.find((l) => l.value === targetLanguage)?.label || "unknown"
      }:\n\n\`\`\`\n${inputText}\n\`\`\``;
    } else {
      prompt = `Translate the following text from ${
        languages.find((l) => l.value === sourceLanguage)?.label || "the original language"
      } to ${
        languages.find((l) => l.value === targetLanguage)?.label || "unknown"
      }:\n\n\`\`\`${sourceLanguage}\n${inputText}\n\`\`\``;
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

  if (isModalOpen) {
    return (
      <>
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div
            className="fixed inset-0 w-full h-full bg-black opacity-40"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="flex items-center min-h-screen px-4 py-8">
            <div className="relative w-full max-w-2xl p-6 mx-auto bg-white dark:bg-gray-800 rounded-md shadow-lg">
              {/* Modal header */}
              <div className="flex justify-between items-center border-b pb-3">
                <BetaBadge />

                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white flex items-center">
                  <IconLanguage className="h-8 w-8 mr-2" />
                  Language Translator
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="sr-only">Close modal</span>
                </button>
              </div>
              {/* Modal content */}
              <div className="mt-4">
                {/* Language selection */}
                <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                  <div className="w-full">
                    <label
                      htmlFor="source-language"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      From
                    </label>
                    <select
                      id="source-language"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      value={sourceLanguage}
                      onChange={(e) => setSourceLanguage(e.target.value)}
                    >
                      <option value="" className={'text-gray-400 dark:text-gray-400'}>Auto-detect</option>
                      {languages.map((language) => (
                        <option key={language.value} value={language.value}>
                          {language.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    id={'translate-language-swap'}
                    onClick={() => {
                      const temp = sourceLanguage;
                      setSourceLanguage(targetLanguage);
                      setTargetLanguage(temp);
                    }}
                    className="hidden md:flex items-center justify-center px-3 py-2 mt-6 md:mt-0 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7h16M4 7l4-4M4 7l4 4M20 17H4M20 17l-4-4M20 17l-4 4"
                      />
                    </svg>
                    <span className="sr-only">Swap languages</span>
                  </button>
                  <div className="w-full">
                    <label
                      htmlFor="target-language"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      To
                    </label>
                    <select
                      id="target-language"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                    >
                      <option value="" className={'text-gray-400 dark:text-gray-400'}>Select language</option>
                      {languages.map((language) => (
                        <option key={language.value} value={language.value}>
                          {language.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Input text area */}
                <div className="my-4">
                  <label
                    htmlFor="input-text"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    Enter text
                  </label>
                  <textarea
                    id="input-text"
                    rows={6}
                    className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Type or paste your text here"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  ></textarea>
                </div>
                {/* Advanced options */}
                <div className="my-4">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 hover:underline"
                  >
                    Advanced Options
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 ml-1 transform ${showAdvanced ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showAdvanced && (
                    <div className="mt-2 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                      {/* Advanced options content */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="translation-type"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                          >
                            Translation Type
                          </label>
                          <select
                            id="translation-type"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            value={translationType}
                            onChange={(e) => setTranslationType(e.target.value)}
                          >
                            <option value="literal">Literal</option>
                            <option value="balanced">Balanced</option>
                            <option value="figurative">Figurative</option>
                            <option value="cultural">Cultural</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="domain-specific"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                          >
                            Domain-Specific Terminology
                          </label>
                          <select
                            id="domain-specific"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            value={domainSpecific}
                            onChange={(e) => setDomainSpecific(e.target.value)}
                          >
                            <option value="general">General</option>
                            <option value="medical">Medical</option>
                            <option value="legal">Legal</option>
                            <option value="technical">Technical</option>
                            <option value="business">Business</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0 mt-4">
                        <div className="flex items-center">
                          <input
                            id="use-formal-language"
                            type="checkbox"
                            checked={useFormalLanguage}
                            onChange={(e) => setUseFormalLanguage(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                          />
                          <label
                            htmlFor="use-formal-language"
                            className="ml-2 block text-sm text-gray-700 dark:text-gray-200"
                          >
                            Use formal language
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="use-gender-neutral-language"
                            type="checkbox"
                            checked={useGenderNeutralLanguage}
                            onChange={(e) => setUseGenderNeutralLanguage(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                          />
                          <label
                            htmlFor="use-gender-neutral-language"
                            className="ml-2 block text-sm text-gray-700 dark:text-gray-200"
                          >
                            Use gender-neutral language
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Add auto-submit toggle before the Translate button */}
                <div className="flex items-center mt-4">
                  <input
                    id="auto-submit"
                    type="checkbox"
                    checked={autoSubmit}
                    onChange={(e) => setAutoSubmit(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                  <label
                    htmlFor="auto-submit"
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-200"
                  >
                    Auto-submit translation
                  </label>
                </div>
                {/* Translate button */}
                <div className="mt-6">
                  <button
                    onClick={handleTranslate}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {autoSubmit ? "Translate" : "Generate Prompt"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  } else {
    return (
      <>
        <button
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            setIsModalOpen(true);
          }}
        >
          <IconLanguage className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
          <span className="sr-only">Translate text</span>
        </button>
      </>
    );
  }
};

export default ChatInputTranslate;
