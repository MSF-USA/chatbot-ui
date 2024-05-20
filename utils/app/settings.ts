import { Settings } from '@/types/settings';

const STORAGE_KEY = 'settings';

export const getSettings = (): Settings => {
  let settings: Settings = {
    theme: 'dark',
    temperature: 1,
    systemPrompt: process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT || "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown."
  };
  const settingsJson = localStorage.getItem(STORAGE_KEY);
  if (settingsJson) {
    try {
      let savedSettings = JSON.parse(settingsJson) as Settings;
      settings = Object.assign(settings, savedSettings);
    } catch (e) {
      console.error(e);
    }
  }
  return settings;
};

export const saveSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
