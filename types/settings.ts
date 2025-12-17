import { SearchMode } from './searchMode';

/**
 * Options for how the user's name is displayed in the app.
 * - firstName: Use given name or first part of display name
 * - lastName: Use surname or last part of display name
 * - fullName: Use complete display name
 * - custom: Use a user-provided custom name
 * - none: Do not display any name (anonymous greeting)
 */
export type DisplayNamePreference =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'custom'
  | 'none';

export interface Settings {
  theme: 'light' | 'dark';
  temperature: number;
  systemPrompt: string;
  advancedMode: boolean;
  defaultSearchMode: SearchMode;
  displayNamePreference: DisplayNamePreference;
  customDisplayName: string;
}
