import { getSettings, saveSettings } from '@/utils/app/settings';

import { Settings } from '@/types/settings';

import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Settings Manager', () => {
  const dummySettings: Settings = {
    theme: 'dark',
    temperature: 0.5,
    systemPrompt: '',
    advancedMode: false
  };

  beforeEach(() => {
    (global as any).localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
    } as any;
  });

  it('getSettings should return the settings from localStorage if exists', () => {
    const localStorageContent = JSON.stringify(dummySettings);
    (global as any).localStorage.getItem.mockReturnValue(localStorageContent);

    const settings = getSettings();
    expect(settings).toMatchObject(dummySettings);
    expect(global.localStorage.getItem).toHaveBeenCalledWith('settings');
  });

  it('getSettings should return default settings if nothing in localStorage', () => {
    (global as any).localStorage.getItem.mockReturnValue(null);

    const settings = getSettings();
    expect(settings).toMatchObject({ theme: 'light' });
    expect((global as any).localStorage.getItem).toHaveBeenCalledWith(
      'settings',
    );
  });

  it('saveSettings should save settings to localStorage', () => {
    saveSettings(dummySettings);

    // saveSettings adds version and lastModified fields, so we just check it was called
    expect((global as any).localStorage.setItem).toHaveBeenCalledWith(
      'settings',
      expect.stringContaining('"theme":"dark"'),
    );
    
    // Verify the saved data includes our original settings plus metadata
    const [[key, value]] = (global as any).localStorage.setItem.mock.calls;
    expect(key).toBe('settings');
    const savedSettings = JSON.parse(value);
    expect(savedSettings).toMatchObject(dummySettings);
    expect(savedSettings).toHaveProperty('version', '1.1.0');
    expect(savedSettings).toHaveProperty('lastModified');
    expect(typeof savedSettings.lastModified).toBe('number');
  });

  it('getSettings should catch if JSON parsing fails', () => {
    (global as any).localStorage.getItem.mockReturnValue('Not a JSON string');

    const oldCLogger = console.error;
    console.error = vi.fn();

    const settings = getSettings();
    expect(console.error).toHaveBeenCalled();
    (console.error as Mock).mockRestore();

    expect(settings).toMatchObject({ theme: 'light' });
    expect((global as any).localStorage.getItem).toHaveBeenCalledWith(
      'settings',
    );

    console.error = oldCLogger;
  });
});
