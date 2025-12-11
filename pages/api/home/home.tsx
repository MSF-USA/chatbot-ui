import { LDProvider, useLDClient } from 'launchdarkly-react-client-sdk';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from 'react-query';
import { useSwipeable } from 'react-swipeable';

import { GetServerSideProps } from 'next';
import { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';

import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST,
  OPENAI_API_HOST_TYPE,
} from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { savePrompts } from '@/utils/app/prompts';
import { getSettings } from '@/utils/app/settings';

import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';
import { OpenAIModelID, OpenAIModels, fallbackModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { Settings } from '@/types/settings';

import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import { SettingsSection } from '@/components/Settings/types';
import { StorageWarningModal } from '@/components/Storage/StorageWarningModal';

import { authOptions } from '../auth/[...nextauth]';
import HomeContext from '@/context/HomeContext';
import { HomeInitialState, initialState } from '@/context/HomeState';

import {
  StorageMonitorProvider,
  useStorageMonitor,
} from '@/context/StorageMonitorContext';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  session: Session | null;
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  defaultModelId: OpenAIModelID;
  launchDarklyClientId: string;
}

// This component manages the storage warning modal
const StorageWarningManager = () => {
  const {
    showStorageWarning,
    setShowStorageWarning,
    checkStorage,
    currentThreshold,
    isEmergencyLevel,
    isCriticalLevel,
    dismissCurrentThreshold,
    resetDismissedThresholds,
    setUserActionCooldown,
  } = useStorageMonitor();
  const { t } = useTranslation('storage');

  const handleClear = () => {
    // Reset dismissed thresholds when user takes action to clear space
    resetDismissedThresholds();
    // Set cooldown to prevent immediate re-showing of modal
    setUserActionCooldown(true);
    // Update storage stats after clearing
    checkStorage();
  };

  return (
    <StorageWarningModal
      isOpen={showStorageWarning}
      onClose={() => setShowStorageWarning(false)}
      onClear={handleClear}
      currentThreshold={currentThreshold}
      isEmergencyLevel={isEmergencyLevel}
      isCriticalLevel={isCriticalLevel}
      onDismissThreshold={dismissCurrentThreshold}
    />
  );
};

const Home = ({
  session,
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
  defaultModelId,
  launchDarklyClientId,
}: Props) => {
  const { data: clientSession } = useSession();
  const user = session?.user || clientSession?.user;
  const router = useRouter();
  const { t } = useTranslation('chat');
  const { getModels } = useApiService();
  const { getModelsError } = useErrorService();
  const [initialRender, setInitialRender] = useState<boolean>(true);

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    state: {
      apiKey,
      lightMode,
      folders,
      conversations,
      selectedConversation,
      prompts,
      temperature,
      systemPrompt,
      showChatbar,
    },
    dispatch,
  } = contextValue;

  useEffect(() => {
    if (clientSession?.error === 'RefreshAccessTokenError') {
      signIn();
    }
  }, [clientSession]);

  const stopConversationRef = useRef<boolean>(false);

  const { data, error, refetch } = useQuery(
    ['GetModels', apiKey, serverSideApiKeyIsSet],
    ({ signal }) => {
      const needKeyAuth =
        !(apiKey || serverSideApiKeyIsSet) && OPENAI_API_HOST_TYPE !== 'apim';
      if (needKeyAuth) return null;

      return getModels(
        {
          key: apiKey,
        },
        signal,
      );
    },
    { enabled: true, refetchOnMount: false },
  );

  useEffect(() => {
    if (data) dispatch({ field: 'models', value: data });
  }, [data, dispatch]);

  useEffect(() => {
    if (user) dispatch({ field: 'user', value: user });
  }, [user, dispatch]);

  useEffect(() => {
    dispatch({ field: 'modelError', value: getModelsError(error) });
  }, [dispatch, error, getModelsError]);

  // FETCH MODELS ----------------------------------------------

  const handleSelectConversation = (conversation: Conversation) => {
    dispatch({
      field: 'selectedConversation',
      value: conversation,
    });

    saveConversation(conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: FolderInterface = {
      id: uuidv4(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];

    dispatch({ field: 'folders', value: updatedFolders });

    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });

    dispatch({ field: 'conversations', value: updatedConversations });
    saveConversations(updatedConversations);

    const updatedPrompts: Prompt[] = prompts.map((p) => {
      if (p.folderId === folderId) {
        return {
          ...p,
          folderId: null,
        };
      }

      return p;
    });

    dispatch({ field: 'prompts', value: updatedPrompts });
    savePrompts(updatedPrompts);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    dispatch({ field: 'folders', value: updatedFolders });

    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

    // Check if the last conversation exists, has no messages, and is already selected
    if (
      lastConversation &&
      lastConversation.messages.length === 0 &&
      selectedConversation?.id === lastConversation.id
    ) {
      // Show a toast notification explaining why nothing is happening
      toast(
        'Current conversation is empty. Add a message to create a new one.',
        { duration: 2500 },
      );
      return;
    }

    // Check if the last conversation exists and has no messages
    if (lastConversation && lastConversation.messages.length === 0) {
      // Just select the last conversation instead of creating a new one
      dispatch({ field: 'selectedConversation', value: lastConversation });
      return;
    }

    // Check if last used model is legacy or not set
    const lastModelIsLegacy =
      lastConversation?.model?.id &&
      OpenAIModels[lastConversation.model.id as OpenAIModelID]?.isLegacy;

    // TODO: Replace with an actual default value given by environment variables, not hardcoded
    // to always use GPT-4o as default, forcing code changes on model deployment changes.
    const modelToUse =
      !lastConversation?.model || lastModelIsLegacy
        ? OpenAIModels[OpenAIModelID.GPT_4o]
        : lastConversation.model;

    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      messages: [],
      model: modelToUse,
      prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      temperature:
        temperature || lastConversation?.temperature || DEFAULT_TEMPERATURE,
      folderId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedConversations = [...conversations, newConversation];

    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    dispatch({ field: 'loading', value: false });
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      updatedAt: new Date().toISOString(),
      createdAt: conversation?.createdAt ?? new Date().toISOString(), // just to set this at some point
      [data.key]: data.value,
    };
    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    dispatch({ field: 'selectedConversation', value: single });
    dispatch({ field: 'conversations', value: all });

    // Save to localStorage
    saveConversation(single);
    saveConversations(all);
  };

  /**
   * Open the settings dialog, optionally navigating to a specific section
   */
  const handleOpenSettings = (section?: SettingsSection) => {
    dispatch({ field: 'settingsDialogOpen', value: true });
    if (section) {
      dispatch({ field: 'settingsDialogSection', value: section });
    }
  };

  /**
   * Close the settings dialog
   */
  const handleCloseSettings = () => {
    dispatch({ field: 'settingsDialogOpen', value: false });
    dispatch({
      field: 'settingsDialogSection',
      value: SettingsSection.GENERAL,
    });
  };

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
  }, [selectedConversation]);

  useEffect(() => {
    defaultModelId &&
      dispatch({
        field: 'defaultModelId',
        value: OpenAIModels[defaultModelId].isLegacy
          ? OpenAIModelID.GPT_4o
          : defaultModelId,
      });
    serverSideApiKeyIsSet &&
      dispatch({
        field: 'serverSideApiKeyIsSet',
        value: serverSideApiKeyIsSet,
      });
    serverSidePluginKeysSet &&
      dispatch({
        field: 'serverSidePluginKeysSet',
        value: serverSidePluginKeysSet,
      });
  }, [defaultModelId, serverSideApiKeyIsSet, serverSidePluginKeysSet]);

  // ON LOAD --------------------------------------------

  useEffect(() => {
    const settings = getSettings();
    applySettings(settings);
    handleApiKey();
    handlePluginKeys();
    handleShowChatbar();
    loadFolders();
    loadPrompts();
    loadConversations();
    selectConversation();
  }, [
    defaultModelId,
    dispatch,
    serverSideApiKeyIsSet,
    serverSidePluginKeysSet,
  ]);

  function applySettings(settings: Settings) {
    if (settings.theme) dispatch({ field: 'lightMode', value: settings.theme });
    if (settings.temperature)
      dispatch({ field: 'temperature', value: settings.temperature });
    if (settings.systemPrompt)
      dispatch({ field: 'systemPrompt', value: settings.systemPrompt });
  }

  function handleApiKey() {
    const apiKey = localStorage.getItem('apiKey');
    if (serverSideApiKeyIsSet || OPENAI_API_HOST_TYPE === 'apim') {
      dispatch({ field: 'apiKey', value: '' });
      localStorage.removeItem('apiKey');
    } else if (apiKey) {
      dispatch({ field: 'apiKey', value: apiKey });
    }
  }

  function handlePluginKeys() {
    const pluginKeys = localStorage.getItem('pluginKeys');
    if (serverSidePluginKeysSet) {
      dispatch({ field: 'pluginKeys', value: [] });
      localStorage.removeItem('pluginKeys');
    } else if (pluginKeys) {
      dispatch({ field: 'pluginKeys', value: pluginKeys });
    }
  }

  function handleShowChatbar() {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar === 'true' });
    }
  }

  function loadFolders() {
    const folders = localStorage.getItem('folders');
    if (folders) {
      dispatch({ field: 'folders', value: JSON.parse(folders) });
    }
  }

  function loadPrompts() {
    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      dispatch({ field: 'prompts', value: JSON.parse(prompts) });
    }
  }

  function loadConversations() {
    const conversationHistory = localStorage.getItem('conversationHistory');
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversationHistory);
      const cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );
      dispatch({ field: 'conversations', value: cleanedConversationHistory });
    }
  }

  function selectConversation() {
    const conversationHistory = localStorage.getItem('conversationHistory');
    let parsedConversationHistory: Conversation[];
    if (conversationHistory) {
      parsedConversationHistory = JSON.parse(conversationHistory);
    } else {
      parsedConversationHistory = [];
    }

    const lastConversation =
      parsedConversationHistory[parsedConversationHistory.length - 1];

    // Check if last used model is legacy or not set
    const lastModelIsLegacy =
      lastConversation?.model?.id &&
      OpenAIModels[lastConversation.model.id as OpenAIModelID]?.isLegacy;

    // TODO: same as above, use environment variable for defaults rather than
    // always using GPT-4o as default if last model was legacy
    const modelToUse =
      !lastConversation?.model || lastModelIsLegacy
        ? OpenAIModels[OpenAIModelID.GPT_4o]
        : lastConversation.model;
    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      messages: [],
      model: modelToUse,
      prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      temperature:
        temperature || lastConversation?.temperature || DEFAULT_TEMPERATURE,
      folderId: null,
    };

    const updatedConversations = [
      ...parsedConversationHistory,
      newConversation,
    ];

    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });
  }

  /**
   * Toggles the visibility of the chatbar
   */
  const handleToggleChatbar = () => {
    dispatch({ field: 'showChatbar', value: !showChatbar });
    localStorage.setItem('showChatbar', JSON.stringify(!showChatbar));
  };

  /**
   * Swipe handlers for mobile devices
   * Swipe left: Open the chatbar if closed
   * Swipe right: Close the chatbar if open
   */
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      handleToggleChatbar();
    },
    onSwipedRight: () => {
      handleToggleChatbar();
    },
    trackMouse: false,
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    delta: 50,
  });

  return (
    <LDProvider
      clientSideID={launchDarklyClientId}
      options={{
        bootstrap: 'localStorage',
        sendEvents: true,
      }}
      context={{
        kind: 'user',
        key: user?.id || 'anonymous-user',
        email: user?.mail,
        givenName: user?.givenName,
        surName: user?.surname,
        displayName: user?.displayName,
        jobTitle: user?.jobTitle,
        department: user?.department,
        companyName: user?.companyName,
      }}
    >
      <HomeContext.Provider
        value={{
          ...contextValue,
          handleNewConversation,
          handleCreateFolder,
          handleDeleteFolder,
          handleUpdateFolder,
          handleSelectConversation,
          handleUpdateConversation,
          handleOpenSettings,
          handleCloseSettings,
          user,
          showChatbar,
        }}
      >
        <Head>
          <title>MSF AI Assistant</title>
          <meta
            name="description"
            content="Chat GPT AI Assistant for MSF Staff - Internal Use Only"
          />
          <meta
            name="viewport"
            content="height=device-height,width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        {selectedConversation && (
          <main
            className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white overflow-x-hidden ${lightMode}`}
          >
            <div className="fixed top-0 w-full sm:hidden">
              <Navbar
                selectedConversation={selectedConversation}
                onNewConversation={handleNewConversation}
              />
            </div>

            <div className="flex h-full w-full pt-[48px] sm:pt-0">
              <Chatbar />

              <div className="flex flex-1 w-full" {...swipeHandlers}>
                <Chat stopConversationRef={stopConversationRef} />
              </div>
            </div>
          </main>
        )}
        <StorageWarningManager />
      </HomeContext.Provider>
    </LDProvider>
  );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({
  locale,
  req,
  res,
}) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const serializedSession = {
    ...session,
    error: null,
  };

  const defaultModelId =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
      ) &&
      process.env.DEFAULT_MODEL) ||
    fallbackModelID;

  let serverSidePluginKeysSet = false;

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCSEId = process.env.GOOGLE_CSE_ID;

  if (googleApiKey && googleCSEId) {
    serverSidePluginKeysSet = true;
  }

  return {
    props: {
      session: serializedSession,
      serverSideApiKeyIsSet:
        !!process.env.OPENAI_API_KEY || OPENAI_API_HOST_TYPE === 'apim',
      defaultModelId,
      serverSidePluginKeysSet,
      launchDarklyClientId: process.env.LAUNCHDARKLY_CLIENT_ID || '',
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'markdown',
        'promptbar',
        'settings',
        'support',
        'transcribeModal',
      ])),
    },
  };
};
