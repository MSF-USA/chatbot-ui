import { IconArrowDown, IconRepeat } from '@tabler/icons-react';
import React, {
  Dispatch,
  KeyboardEvent,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

import {
  CommandDefinition,
  CommandExecutionResult,
  CommandParser,
  CommandType,
  ParsedCommand,
} from '@/services/commandParser';
import { LocalizedCommandParser } from '@/services/localizedCommandParser';

import { AgentType } from '@/types/agent';
import { incrementModelUsage, getModelUsageCount } from '@/utils/app/modelUsage';
import { incrementPromptUsage, getPromptUsageCount } from '@/utils/app/promptUsage';
import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
  Message,
  MessageType,
  TextMessageContent,
  getChatMessageContent,
} from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import { Plugin, PluginID } from '@/types/plugin';
import { Prompt } from '@/types/prompt';

import HomeContext from '@/contexts/home.context';

import ChatFileUploadPreviews from '@/components/Chat/ChatInput/ChatFileUploadPreviews';
import { ChatInputAgentToggle } from '@/components/Chat/ChatInput/ChatInputAgentToggle';
import ChatInputFile from '@/components/Chat/ChatInput/ChatInputFile';
import ChatInputImage from '@/components/Chat/ChatInput/ChatInputImage';
import ChatInputImageCapture, {
  ChatInputImageCaptureRef,
} from '@/components/Chat/ChatInput/ChatInputImageCapture';
import ChatInputSubmitButton from '@/components/Chat/ChatInput/ChatInputSubmitButton';
import ChatInputTranscribe from '@/components/Chat/ChatInput/ChatInputTranscribe';
import ChatInputTranslate from '@/components/Chat/ChatInput/ChatInputTranslate';
import ChatInputVoiceCapture from '@/components/Chat/ChatInput/ChatInputVoiceCapture';
import ChatDropdown from '@/components/Chat/ChatInput/Dropdown';
import { onFileUpload } from '@/components/Chat/ChatInputEventHandlers/file-upload';

import { ModelList } from './ModelList';
import { PromptList } from './PromptList';
import { VariableModal } from './VariableModal';

interface Props {
  onSend: (
    message: Message,
    plugin: Plugin | null,
    forceStandardChat?: boolean,
    forcedAgentType?: AgentType,
  ) => void;
  onRegenerate: () => void;
  onNewConversation?: () => void;
  onScrollDownClick: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  filePreviews: FilePreview[];
  setRequestStatusMessage?: Dispatch<SetStateAction<string | null>>;
  setProgress?: Dispatch<SetStateAction<number | null>>;
  apiKey?: string;
  pluginKeys?: { pluginId: PluginID; requiredKeys: any[] }[];
  systemPrompt?: string;
  temperature?: number;
  onTemperatureChange?: (temperature: number) => void;
  onAgentToggleChange?: (enabled: boolean) => void;
  onSettingsOpen?: () => void;
  onPrivacyPolicyOpen?: () => void;
  onModelChange?: (model: any) => void;
  models?: any[];
  selectedConversation?: any;
  currentMessage?: Message;
  onAddChatMessages?: (userMessage: Message, assistantMessage: Message) => void;
}

export const ChatInput = ({
  onSend,
  onRegenerate,
  onNewConversation,
  onScrollDownClick,
  stopConversationRef,
  textareaRef,
  showScrollDownButton,
  filePreviews,
  setFilePreviews,
  setRequestStatusMessage,
  setProgress,
  apiKey,
  pluginKeys,
  systemPrompt,
  temperature,
  onTemperatureChange,
  onAgentToggleChange,
  onSettingsOpen,
  onPrivacyPolicyOpen,
  onModelChange,
  models,
  selectedConversation,
  currentMessage,
  onAddChatMessages,
}: Props) => {
  const { t } = useTranslation('chat');
  const router = useRouter();
  const currentLocale = router.locale || 'en';

  const {
    state: {
      selectedConversation: contextSelectedConversation,
      messageIsStreaming,
      prompts,
    },
    handleUpdateConversation: contextHandleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  // Use the passed selectedConversation or fall back to context
  const currentConversation =
    selectedConversation || contextSelectedConversation;

  const [textFieldValue, setTextFieldValue] = useState<string>('');
  const [imageFieldValue, setImageFieldValue] = useState<
    ImageMessageContent | ImageMessageContent[] | null
  >();
  const [fileFieldValue, setFileFieldValue] = useState<
    | FileMessageContent
    | FileMessageContent[]
    | ImageMessageContent
    | ImageMessageContent[]
    | null
  >(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState<boolean>(false);
  const [activePromptIndex, setActivePromptIndex] = useState<number>(0);
  const [promptInputValue, setPromptInputValue] = useState<string>('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [promptForVariableModal, setPromptForVariableModal] = useState<Prompt | null>(null);
  const [showPluginSelect, setShowPluginSelect] = useState<boolean>(false);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [submitType, setSubmitType] = useState<ChatInputSubmitTypes>('text');
  const [placeholderText, setPlaceholderText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [agentToggleEnabled, setAgentToggleEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatAgentsEnabled');
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Command system state
  const [commandParser] = useState(() => LocalizedCommandParser.getInstance());
  const [availableCommands, setAvailableCommands] = useState<
    CommandDefinition[]
  >([]);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(
    null,
  );
  const [forcedAgent, setForcedAgent] = useState<AgentType | null>(null);
  const [commandMode, setCommandMode] = useState<boolean>(false);

  // Model selection state
  const [showModelList, setShowModelList] = useState<boolean>(false);
  const [activeModelIndex, setActiveModelIndex] = useState<number>(0);
  const [modelInputValue, setModelInputValue] = useState<string>('');

  const promptListRef = useRef<HTMLUListElement | null>(null);
  const modelListRef = useRef<HTMLUListElement | null>(null);
  const cameraRef = useRef<ChatInputImageCaptureRef>(null);

  const filteredPrompts: Prompt[] = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  // Filter commands based on current input (match name or description)
  const filteredCommands: CommandDefinition[] = commandMode
    ? availableCommands.filter((command) => {
        const searchTerm = promptInputValue.toLowerCase();
        return (
          command.command.toLowerCase().includes(searchTerm) ||
          command.description.toLowerCase().includes(searchTerm)
        );
      })
    : [];

  // Filter models based on current input
  const filteredModels: OpenAIModel[] = useMemo(() => {
    return models
      ? models.filter((model) => {
          const searchTerm = modelInputValue.toLowerCase();
          return (
            model.id.toLowerCase().includes(searchTerm) ||
            model.name.toLowerCase().includes(searchTerm)
          );
        })
      : [];
  }, [models, modelInputValue]);

  // Sort filtered models by usage count and legacy status
  const sortedFilteredModels: OpenAIModel[] = useMemo(() => {
    return [...filteredModels].sort((a, b) => {
      // Primary sort: Non-legacy models first
      const aIsLegacy = (a as any).isLegacy || false;
      const bIsLegacy = (b as any).isLegacy || false;
      if (aIsLegacy && !bIsLegacy) return 1;
      if (!aIsLegacy && bIsLegacy) return -1;
      
      // Secondary sort: Higher usage count first (within same legacy status)
      const aUsage = getModelUsageCount(a.id);
      const bUsage = getModelUsageCount(b.id);
      if (aUsage !== bUsage) return bUsage - aUsage;
      
      // Tertiary sort: Preserve original order for equal usage
      return 0;
    });
  }, [filteredModels]);

  // Sort filtered prompts by usage count
  const sortedFilteredPrompts: Prompt[] = useMemo(() => {
    return [...filteredPrompts].sort((a, b) => {
      const aUsage = getPromptUsageCount(a.id);
      const bUsage = getPromptUsageCount(b.id);
      // Higher usage first, preserve original order for equal usage
      if (aUsage !== bUsage) return bUsage - aUsage;
      return 0;
    });
  }, [filteredPrompts]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value: string = e.target.value;
    const maxLength: number | undefined =
      selectedConversation?.model?.maxLength;

    if (maxLength && value.length > maxLength) {
      alert(
        t(
          `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
          { maxLength, valueLength: value.length },
        ),
      );
      return;
    }

    setTextFieldValue(value);

    // If model list is shown, update model filter instead
    if (showModelList) {
      setModelInputValue(value);
      setActiveModelIndex(0); // Reset to first filtered result
    } else {
      updatePromptListVisibility(value);
    }
  };

  const buildContent = () => {
    const wrapInArray = (value: any) =>
      Array.isArray(value) ? value : [value];

    if (submitType === 'text') {
      return textFieldValue;
    } else if (submitType === 'image') {
      const imageContents = imageFieldValue
        ? [...wrapInArray(imageFieldValue), ...wrapInArray(fileFieldValue)]
        : fileFieldValue
        ? [...wrapInArray(fileFieldValue)]
        : [];
      return [
        ...imageContents,
        { type: 'text', text: textFieldValue } as TextMessageContent,
      ];
    } else if (submitType === 'file' || submitType == 'multi-file') {
      const fileContents = fileFieldValue ? wrapInArray(fileFieldValue) : [];
      return [
        ...fileContents,
        { type: 'text', text: textFieldValue } as TextMessageContent,
      ];
    } else {
      throw new Error(`Invalid submit type for message: ${submitType}`);
    }
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      if (filePreviews.length > 0) {
        setFilePreviews([]);
      }
      return;
    }

    let messageText = textFieldValue;
    let forceStandardChat = agentToggleEnabled ? undefined : true;
    let forcedAgentType: AgentType | null = null;

    // Check if this is a command
    const commandMatch = /^\/\w+/.exec(textFieldValue.trim());
    if (commandMatch) {
      // Prepare context for command execution
      const commandContext = {
        models: models || [],
        selectedConversation: currentConversation,
        temperature: temperature,
        currentMessage: currentMessage,
      };

      const parsed = commandParser.parseLocalizedInput(textFieldValue, currentLocale);
      if (parsed && parsed.valid) {
        const executionResult = commandParser.executeCommand(
          parsed,
          commandContext,
        );

        if (executionResult.success) {
          // Handle command execution
          if (executionResult.agentType) {
            forcedAgentType = executionResult.agentType;
            // Commands always override the agent toggle - they are explicit user instructions
            // Set to undefined to allow the command's agent to work regardless of toggle state
            forceStandardChat = undefined;
            // Remove command from message text, keeping the rest
            messageText = textFieldValue.replace(/^\/\w+\s*/, '').trim();
          }

          // Handle chat responses (commands that should add messages to chat history)
          if (executionResult.chatResponse && onAddChatMessages) {
            const userMessage: Message = {
              role: 'user',
              content: executionResult.chatResponse.userMessage,
              messageType: MessageType.TEXT,
            };

            const assistantMessage: Message = {
              role: 'assistant',
              content: executionResult.chatResponse.assistantMessage,
              messageType: MessageType.TEXT,
            };

            onAddChatMessages(userMessage, assistantMessage);
          }

          if (executionResult.settingsChange) {
            // Handle settings changes
            console.log('Settings change:', executionResult.settingsChange);

            // Handle temperature changes
            if (
              executionResult.settingsChange.temperature !== undefined &&
              onTemperatureChange
            ) {
              onTemperatureChange(executionResult.settingsChange.temperature);
            }

            // Handle agent toggle changes
            if (
              executionResult.settingsChange.agentSettings?.enabled !==
                undefined &&
              onAgentToggleChange
            ) {
              onAgentToggleChange(
                executionResult.settingsChange.agentSettings.enabled,
              );
              // Also update local state
              setAgentToggleEnabled(
                executionResult.settingsChange.agentSettings.enabled,
              );
              if (typeof window !== 'undefined') {
                localStorage.setItem(
                  'chatAgentsEnabled',
                  JSON.stringify(
                    executionResult.settingsChange.agentSettings.enabled,
                  ),
                );
              }
            }

            // Handle model changes
            if (executionResult.settingsChange.model && onModelChange) {
              onModelChange(executionResult.settingsChange.model);
            }
          }

          if (executionResult.utilityAction) {
            // Handle utility actions
            handleUtilityAction(executionResult.utilityAction);
          }

          // For commands with chat responses or immediate actions, clear input and return
          if (executionResult.chatResponse || executionResult.immediateAction) {
            setTextFieldValue('');
            setCommandMode(false);
            setParsedCommand(null);
            return;
          }

          // Show success toast only for commands without chat responses
          if (executionResult.message && !executionResult.chatResponse) {
            toast.success(executionResult.message);
          }

          // If it's just a settings command without remaining text, don't send a message
          if (!messageText) {
            setTextFieldValue('');
            setCommandMode(false);
            setParsedCommand(null);
            return;
          }
        } else {
          // Command execution failed, return silently
          // Commands should execute without toast notifications
          return;
        }
      } else {
        // Invalid command, proceed normally (let it be sent as regular text)
      }
    }

    // Apply forced agent if set
    if (forcedAgent) {
      forcedAgentType = forcedAgent;
      // Commands always override the agent toggle - they are explicit user instructions
      forceStandardChat = undefined;
      setForcedAgent(null); // Reset after use
    }

    const content:
      | string
      | TextMessageContent
      | (TextMessageContent | FileMessageContent)[]
      | (TextMessageContent | ImageMessageContent)[] = buildContent();

    if (!messageText) {
      alert(t('Please enter a message'));
      return;
    }

    onSend(
      {
        role: 'user',
        content: submitType === 'text' ? messageText : content,
        messageType: submitType ?? 'text',
      },
      plugin,
      forceStandardChat,
      forcedAgentType || undefined, // Pass the forced agent type
    );
    setTextFieldValue('');
    setImageFieldValue(null);
    setFileFieldValue(null);
    setPlugin(null);
    setSubmitType('text');
    setCommandMode(false);
    setParsedCommand(null);

    if (filePreviews.length > 0) {
      setFilePreviews([]);
    }

    if (window.innerWidth < 640 && textareaRef?.current) {
      textareaRef.current.blur();
    }
  };

  const handleStopConversation = () => {
    console.log('Stop button pressed');
    stopConversationRef.current = true;
    homeDispatch({ field: 'messageIsStreaming', value: false });
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  /**
   * Unified handler for selecting items from the dropdown (commands or prompts)
   * @param index - The index of the selected item in the combined list
   */
  const handleDropdownItemSelection = (index: number) => {
    const commandsCount = commandMode ? filteredCommands.length : 0;
    
    if (index < commandsCount) {
      // It's a command
      const command = filteredCommands[index];
      if (command) {
        handleCommandSelect(command);
      }
    } else {
      // It's a prompt
      const promptIndex = index - commandsCount;
      const prompt = sortedFilteredPrompts[promptIndex];
      if (prompt) {
        setTextFieldValue((prevTextFieldValue) => {
          const newContent = prevTextFieldValue?.replace(
            /\/\w*$/,
            prompt.content,
          );
          return newContent;
        });
        handlePromptSelect(prompt);
      }
    }
    
    setShowPromptList(false);
  };

  const handleKeyDownInput = (
    key: string,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      key === 'Enter' &&
      !isTyping &&
      !isMobile() &&
      !event.shiftKey &&
      !event.ctrlKey
    ) {
      event.preventDefault();
      handleSend();
      if (submitType !== 'text') {
        setSubmitType('text');
      }
      if (filePreviews.length > 0) {
        setFilePreviews([]);
      }
    } else if (event.key === '/' && event.metaKey && submitType === 'text') {
      event.preventDefault();
      setShowPluginSelect(!showPluginSelect);
    }
  };

  const handleKeyDownPromptList = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    const totalItems = commandMode
      ? filteredCommands.length + sortedFilteredPrompts.length
      : sortedFilteredPrompts.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < totalItems - 1 ? prevIndex + 1 : prevIndex,
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
        break;
      case 'Tab':
        event.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < totalItems - 1 ? prevIndex + 1 : 0,
        );
        break;
      case 'Enter':
        event.preventDefault();
        handleDropdownItemSelection(activePromptIndex);
        if (submitType !== 'text') {
          setSubmitType('text');
        }
        if (filePreviews.length > 0) {
          setFilePreviews([]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setShowPromptList(false);
        setCommandMode(false);
        break;
      default:
        setActivePromptIndex(0);
        break;
    }
  };

  const handleKeyDownModelList = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    const availableModels = sortedFilteredModels || [];

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveModelIndex((prevIndex) =>
          prevIndex < availableModels.length - 1 ? prevIndex + 1 : 0,
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveModelIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : availableModels.length - 1,
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (availableModels.length > 0) {
          handleModelSelect(availableModels[activeModelIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setShowModelList(false);
        setModelInputValue(''); // Clear filter when closing
        setTextFieldValue(''); // Clear the input
        setActiveModelIndex(0); // Reset index
        break;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showModelList) {
      handleKeyDownModelList(e);
    } else if (showPromptList) {
      handleKeyDownPromptList(e);
    } else {
      // Handle cases when showPromptList is false
      handleKeyDownInput(e.key, e);
    }
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback(
    (text: string) => {
      const match = /\/\w*$/.exec(text);

      if (match) {
        const input = match[0];
        const partialCommand = input.slice(1);

        // Try to parse as command first with context
        const commandContext = {
          models: models || [],
          selectedConversation: currentConversation,
          temperature: temperature,
          currentMessage: currentMessage,
        };
        const parsed = commandParser.parseLocalizedInput(
          input,
          currentLocale,
          commandContext,
        );
        setParsedCommand(parsed);

        // Show prompt list and set command mode
        setShowPromptList(true);
        setPromptInputValue(partialCommand);
        setCommandMode(true);

        // Get command suggestions
        const suggestions = commandParser.getLocalizedCommandSuggestions(
          partialCommand,
          'en',
        );
        setAvailableCommands(suggestions.slice(0, 5)); // Limit to 5 suggestions
      } else {
        setShowPromptList(false);
        setPromptInputValue('');
        setCommandMode(false);
        setParsedCommand(null);
        setAvailableCommands([]);
      }
    },
    [commandParser, currentConversation, models, temperature],
  );

  const handlePromptSelect = (prompt: Prompt) => {
    // Track prompt usage for sorting
    incrementPromptUsage(prompt.id);
    
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setPromptForVariableModal(prompt);  // Store the selected prompt for the variable modal
      setIsModalVisible(true);
    } else {
      setTextFieldValue((prevContent) => {
        const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
        return updatedContent;
      });
      updatePromptListVisibility(prompt.content);
    }
  };

  const handleModelSelect = (model: OpenAIModel) => {
    // Track model usage for sorting
    incrementModelUsage(model.id);
    
    // Hide the model list
    setShowModelList(false);
    setActiveModelIndex(0);
    setModelInputValue(''); // Clear filter
    setTextFieldValue(''); // Clear input field

    // Use the conversation from props or context
    const conversation = selectedConversation || currentConversation;

    if (conversation && contextHandleUpdateConversation) {
      contextHandleUpdateConversation(conversation, {
        key: 'model',
        value: model,
      });
    }

    // Also call onModelChange if provided
    if (onModelChange) {
      onModelChange(model);
    }
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = textFieldValue?.replace(
      /{{(.*?)}}/g,
      (match, variable) => {
        const index = variables.indexOf(variable);
        return updatedVariables[index];
      },
    );
    setTextFieldValue(newContent);

    setFilePreviews([]);

    if (textareaRef?.current) {
      textareaRef.current.focus();
    }
  };

  /**
   * Handle command selection from the command list
   */
  const handleCommandSelect = (command: CommandDefinition) => {
    // Check if this command should execute immediately (same logic as PromptList)
    const shouldExecuteImmediately = [
      'enableAgents',
      'disableAgents',
      'settings',
      'privacyPolicy',
    ].includes(command.command);

    // Handle model command specially - show model selection list
    if (command.command === 'model') {
      setShowModelList(true);
      setActiveModelIndex(0);
      setTextFieldValue('');
      setModelInputValue(''); // Clear model filter
      setShowPromptList(false);
      return;
    }

    if (shouldExecuteImmediately) {
      // Execute immediately like the mouse click path
      const commandContext = {
        models: models || [],
        selectedConversation: currentConversation,
        temperature: temperature,
        currentMessage: currentMessage,
      };

      const parsed = commandParser.parseInput(
        `/${command.command}`,
        commandContext,
      );
      if (parsed && parsed.valid) {
        const executionResult = commandParser.executeCommand(
          parsed,
          commandContext,
        );

        if (executionResult.success) {
          // Handle chat responses - but skip for pure utility commands that only open dialogs
          const isPureUtilityCommand = ['settings', 'privacyPolicy'].includes(
            command.command,
          );
          if (
            executionResult.chatResponse &&
            onAddChatMessages &&
            !isPureUtilityCommand
          ) {
            const userMessage: Message = {
              role: 'user',
              content: executionResult.chatResponse.userMessage,
              messageType: MessageType.TEXT,
            };

            const assistantMessage: Message = {
              role: 'assistant',
              content: executionResult.chatResponse.assistantMessage,
              messageType: MessageType.TEXT,
            };

            onAddChatMessages(userMessage, assistantMessage);
          }

          // Handle settings changes
          if (executionResult.settingsChange) {
            if (
              executionResult.settingsChange.temperature !== undefined &&
              onTemperatureChange
            ) {
              onTemperatureChange(executionResult.settingsChange.temperature);
            }

            if (
              executionResult.settingsChange.agentSettings?.enabled !==
                undefined &&
              onAgentToggleChange
            ) {
              onAgentToggleChange(
                executionResult.settingsChange.agentSettings.enabled,
              );
              setAgentToggleEnabled(
                executionResult.settingsChange.agentSettings.enabled,
              );
              if (typeof window !== 'undefined') {
                localStorage.setItem(
                  'chatAgentsEnabled',
                  JSON.stringify(
                    executionResult.settingsChange.agentSettings.enabled,
                  ),
                );
              }
            }

            if (executionResult.settingsChange.model && onModelChange) {
              onModelChange(executionResult.settingsChange.model);
            }
          }

          // Handle utility actions
          if (executionResult.utilityAction) {
            handleUtilityAction(executionResult.utilityAction);
          }
        } else {
          // Command execution failed, handle silently
          // Commands should execute without toast notifications
        }
      }

      // Clear input and close command mode (same as immediate execution)
      setTextFieldValue('');
      setCommandMode(false);
      setParsedCommand(null);
      setShowPromptList(false);
    } else {
      // Regular command selection - replace text and handle normally
      setTextFieldValue((prevValue) => {
        const newValue = prevValue?.replace(/\/\w*$/, `/${command.command} `);
        return newValue;
      });

      // If it's an agent command, set the forced agent
      if (command.type === CommandType.AGENT) {
        switch (command.command) {
          case 'search':
            setForcedAgent(AgentType.WEB_SEARCH);
            break;
          case 'code':
            setForcedAgent(AgentType.CODE_INTERPRETER);
            break;
          case 'url':
            setForcedAgent(AgentType.URL_PULL);
            break;
          case 'knowledge':
            setForcedAgent(AgentType.LOCAL_KNOWLEDGE);
            break;
          case 'standard':
          case 'noAgents':
            setForcedAgent(AgentType.STANDARD_CHAT);
            break;
        }
      }

      setShowPromptList(false);
      setCommandMode(false);

      if (textareaRef?.current) {
        textareaRef.current.focus();
      }
    }
  };

  /**
   * Handle utility actions from commands
   */
  const handleUtilityAction = (action: string) => {
    switch (action) {
      case 'open_settings':
        if (onSettingsOpen) {
          onSettingsOpen();
        } else {
          console.log('Opening settings dialog');
        }
        break;
      case 'open_privacy_policy':
        if (onPrivacyPolicyOpen) {
          onPrivacyPolicyOpen();
        } else {
          console.log('Opening privacy policy in settings');
        }
        break;
      case 'new_chat':
        if (onNewConversation) {
          onNewConversation();
        } else {
          console.log('Starting new conversation');
        }
        break;
      case 'regenerate_response':
        if (onRegenerate) {
          onRegenerate();
        } else {
          console.log('Regenerating response');
        }
        break;
      case 'show_help':
        // Help is handled via toast message, no additional action needed
        break;
      default:
        console.log('Unknown utility action:', action);
    }
  };

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;
    }
  }, [textFieldValue, textareaRef]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node)
      ) {
        setShowPromptList(false);
      }

      if (
        modelListRef.current &&
        !modelListRef.current.contains(e.target as Node)
      ) {
        setShowModelList(false);
        setActiveModelIndex(0);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 600;
    const fullPlaceholder = t('chatInputPlaceholderFull') || '';
    const trimmedPlaceholder = isMobile
      ? t('chatInputPlaceholder')
      : fullPlaceholder;
    setPlaceholderText(trimmedPlaceholder);
  }, [t]);

  const handleFiles = (files: FileList | File[]) => {
    const filesArray = Array.from(files);

    if (filesArray.length > 0) {
      onFileUpload(
        filesArray,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      handleFiles(files);
      try {
        e.dataTransfer.clearData();
      } catch (err: any) {
        // e.target.value = ""
      }
    }
  };

  const preventSubmission = (): boolean => {
    return isTranscribing || messageIsStreaming;
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white dark:bg-[#212121] border-t border-gray-200 dark:border-gray-700 dark:border-opacity-50 transition-colors ${
        isDragOver
          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
          : ''
      }`}
    >
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/70 dark:bg-blue-900/30 backdrop-blur-sm z-10 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <div className="text-blue-500 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {filePreviews.length > 0 && (
        <div className="px-4 py-2 max-h-52 overflow-y-auto">
          <div className="w-full flex justify-center items-center space-x-2">
            <ChatFileUploadPreviews
              filePreviews={filePreviews}
              setFilePreviews={setFilePreviews}
              setSubmitType={setSubmitType}
            />
          </div>
        </div>
      )}

      <div className={'flex justify-center'}>
        {!messageIsStreaming &&
          !filePreviews.length &&
          selectedConversation &&
          selectedConversation.messages.length > 0 && (
            <button
              className="max-h-52 overflow-y-auto flex items-center gap-3 mb-1 rounded border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#212121] dark:text-white md:mb-1 md:mt-2"
              onClick={onRegenerate}
            >
              <IconRepeat size={16} /> {t('Regenerate response')}
            </button>
          )}
      </div>

      <div className="sticky bottom-0 items-center bg-white dark:bg-[#212121]">
        <div className="flex justify-center items-center space-x-2 px-2 md:px-4">
          <ChatInputFile
            onFileUpload={onFileUpload}
            setSubmitType={setSubmitType}
            setFilePreviews={setFilePreviews}
            setFileFieldValue={setFileFieldValue}
            setImageFieldValue={setImageFieldValue}
            setUploadProgress={setUploadProgress}
          />

          <ChatInputImageCapture
            ref={cameraRef}
            setSubmitType={setSubmitType}
            prompt={textFieldValue}
            setFilePreviews={setFilePreviews}
            setImageFieldValue={setFileFieldValue}
            setUploadProgress={setUploadProgress}
            visible={false}
            hasCameraSupport={true}
          />

          <ChatDropdown
            onFileUpload={onFileUpload}
            setSubmitType={setSubmitType}
            setFilePreviews={setFilePreviews}
            setFileFieldValue={setFileFieldValue}
            setImageFieldValue={setImageFieldValue}
            setUploadProgress={setUploadProgress}
            setTextFieldValue={setTextFieldValue}
            handleSend={handleSend}
            textFieldValue={textFieldValue}
            onCameraClick={() => {
              cameraRef.current?.triggerCamera();
            }}
            onSend={onSend}
            setRequestStatusMessage={setRequestStatusMessage}
            setProgress={setProgress}
            apiKey={apiKey}
            pluginKeys={pluginKeys}
            systemPrompt={systemPrompt}
            temperature={temperature}
          />

          <div className="relative mx-2 max-w-[900px] flex w-full flex-grow flex-col rounded-md border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-gray-900/50 dark:bg-[#40414F] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] sm:mx-4">
            <div className="absolute left-2 top-1 flex items-center space-x-1">
              <ChatInputVoiceCapture
                setTextFieldValue={setTextFieldValue}
                setIsTranscribing={setIsTranscribing}
              />
              <ChatInputAgentToggle
                enabled={agentToggleEnabled}
                onToggle={() => {
                  const newValue = !agentToggleEnabled;
                  setAgentToggleEnabled(newValue);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(
                      'chatAgentsEnabled',
                      JSON.stringify(newValue),
                    );
                  }
                }}
                disabled={isTranscribing || messageIsStreaming}
              />
            </div>

            <textarea
              ref={textareaRef}
              className={
                'm-0 w-full resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-20 text-black dark:bg-transparent dark:text-white md:py-3 md:pl-20 lg:' +
                (isTranscribing ? ' animate-pulse' : '')
              }
              style={{
                resize: 'none',
                bottom: `${textareaRef?.current?.scrollHeight}px`,
                maxHeight: '400px',
                overflow: `${
                  textareaRef.current && textareaRef.current.scrollHeight > 400
                    ? 'auto'
                    : 'hidden'
                }`,
              }}
              placeholder={
                isTranscribing
                  ? t('transcribingChatPlaceholder')
                  : placeholderText
              }
              value={textFieldValue}
              rows={1}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={preventSubmission()}
            />

            <div className="absolute right-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200">
              <ChatInputSubmitButton
                messageIsStreaming={messageIsStreaming}
                isTranscribing={isTranscribing}
                handleSend={handleSend}
                handleStopConversation={handleStopConversation}
                preventSubmission={preventSubmission}
              />
            </div>

            {showScrollDownButton && (
              <div className="absolute bottom-12 right-0 lg:bottom-0 lg:-right-10">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
                  onClick={onScrollDownClick}
                >
                  <IconArrowDown size={18} />
                </button>
              </div>
            )}

            {showPromptList &&
              (filteredCommands.length > 0 || filteredPrompts.length > 0) && (
                <div className="absolute bottom-12 w-full">
                  <PromptList
                    activePromptIndex={activePromptIndex}
                    prompts={sortedFilteredPrompts}
                    commands={filteredCommands}
                    showCommands={commandMode}
                    onSelect={handleDropdownItemSelection}
                    onMouseOver={setActivePromptIndex}
                    promptListRef={promptListRef}
                    onImmediateCommandExecution={(command) => {
                      // Execute the command immediately with context
                      const commandContext = {
                        models: models || [],
                        selectedConversation: currentConversation,
                        temperature: temperature,
                        currentMessage: currentMessage,
                      };

                      const parsed = commandParser.parseInput(
                        `/${command.command}`,
                        commandContext,
                      );
                      if (parsed && parsed.valid) {
                        const executionResult = commandParser.executeCommand(
                          parsed,
                          commandContext,
                        );

                        if (executionResult.success) {
                          // Handle chat responses - but skip for pure utility commands that only open dialogs
                          const isPureUtilityCommand = [
                            'settings',
                            'privacyPolicy',
                          ].includes(command.command);
                          if (
                            executionResult.chatResponse &&
                            onAddChatMessages &&
                            !isPureUtilityCommand
                          ) {
                            const userMessage: Message = {
                              role: 'user',
                              content: executionResult.chatResponse.userMessage,
                              messageType: MessageType.TEXT,
                            };

                            const assistantMessage: Message = {
                              role: 'assistant',
                              content:
                                executionResult.chatResponse.assistantMessage,
                              messageType: MessageType.TEXT,
                            };

                            onAddChatMessages(userMessage, assistantMessage);
                          }

                          // Handle settings changes
                          if (executionResult.settingsChange) {
                            if (
                              executionResult.settingsChange.temperature !==
                                undefined &&
                              onTemperatureChange
                            ) {
                              onTemperatureChange(
                                executionResult.settingsChange.temperature,
                              );
                            }

                            if (
                              executionResult.settingsChange.agentSettings
                                ?.enabled !== undefined &&
                              onAgentToggleChange
                            ) {
                              onAgentToggleChange(
                                executionResult.settingsChange.agentSettings
                                  .enabled,
                              );
                              setAgentToggleEnabled(
                                executionResult.settingsChange.agentSettings
                                  .enabled,
                              );
                              if (typeof window !== 'undefined') {
                                localStorage.setItem(
                                  'chatAgentsEnabled',
                                  JSON.stringify(
                                    executionResult.settingsChange.agentSettings
                                      .enabled,
                                  ),
                                );
                              }
                            }

                            if (
                              executionResult.settingsChange.model &&
                              onModelChange
                            ) {
                              onModelChange(
                                executionResult.settingsChange.model,
                              );
                            }
                          }

                          // Handle utility actions
                          if (executionResult.utilityAction) {
                            handleUtilityAction(executionResult.utilityAction);
                          }
                        } else {
                          toast.error(
                            executionResult.error || 'Command execution failed',
                          );
                        }
                      }

                      // Clear input and close command mode
                      setTextFieldValue('');
                      setCommandMode(false);
                      setParsedCommand(null);
                      setShowPromptList(false);
                    }}
                  />
                </div>
              )}

            {showModelList && models && models.length > 0 && (
              <div className="absolute bottom-12 w-full">
                <ModelList
                  models={sortedFilteredModels}
                  activeModelIndex={activeModelIndex}
                  onSelect={() => {
                    if (sortedFilteredModels.length > 0) {
                      handleModelSelect(sortedFilteredModels[activeModelIndex]);
                    }
                  }}
                  onMouseOver={setActiveModelIndex}
                  modelListRef={modelListRef}
                />
              </div>
            )}
          </div>

          {isModalVisible && promptForVariableModal && (
            <VariableModal
              prompt={promptForVariableModal}
              variables={variables}
              onSubmit={handleSubmit}
              onClose={() => {
                setIsModalVisible(false);
                setPromptForVariableModal(null);  // Clear prompt for variable modal when closing
              }}
            />
          )}
        </div>
      </div>
      <div className="px-3 pt-2 pb-3 text-center items-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-3 md:pb-6">
        {t('chatDisclaimer')}
      </div>
    </div>
  );
};
