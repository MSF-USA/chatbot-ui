import { Settings } from '@/types/settings';

const STORAGE_KEY = 'settings';

const getDefaultSettings = (): Settings => {
  const userDefaultThemeIsDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    theme: userDefaultThemeIsDark ? 'dark' : 'light',
    temperature: 0.5,
    systemPrompt:
      process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
      "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.",
    runTypeWriterIntroSetting: true,
  };
};

export const getSettings = (): Settings => {
  const defaultSettings = getDefaultSettings();

  const settingsJson = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (!settingsJson) {
    return defaultSettings;
  }

  try {
    const savedSettings = JSON.parse(settingsJson) as Settings;
    return { ...defaultSettings, ...savedSettings };
  } catch (error) {
    console.error('Error parsing saved settings:', error);
    return defaultSettings;
  }
};

export const saveSettings = (settings: Settings) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};