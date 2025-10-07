import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

interface StreamingSettings {
  smoothStreamingEnabled: boolean;
  charsPerFrame: number;
  frameDelay: number;
}

interface StreamingSettingsContextType {
  settings: StreamingSettings;
  updateSettings: (updatedSettings: Partial<StreamingSettings>) => void;
}

// Default settings
const defaultSettings: StreamingSettings = {
  smoothStreamingEnabled: true, // Default to enabled
  charsPerFrame: 3, // Characters per frame for animation
  frameDelay: 10, // Milliseconds between frames
};

const LOCAL_STORAGE_KEY = 'chatbot-ui-streaming-settings';

const StreamingSettingsContext = createContext<StreamingSettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export const useStreamingSettings = () => useContext(StreamingSettingsContext);

export const StreamingSettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [settings, setSettings] = useState<StreamingSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(
          savedSettings,
        ) as Partial<StreamingSettings>;
        setSettings((prev) => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      console.error('Error loading streaming settings:', error);
    }
  }, []);

  // Update settings and save to localStorage
  const updateSettings = (updatedSettings: Partial<StreamingSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updatedSettings };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
      } catch (error) {
        console.error('Error saving streaming settings:', error);
      }
      return newSettings;
    });
  };

  return (
    <StreamingSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </StreamingSettingsContext.Provider>
  );
};
