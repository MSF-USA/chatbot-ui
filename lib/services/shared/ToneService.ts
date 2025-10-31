import { Message } from '@/types/chat';

import fs from 'fs';
import path from 'path';

/**
 * Tone configuration from user settings.
 */
interface Tone {
  id: string;
  name: string;
  voiceRules?: string;
}

/**
 * User settings structure.
 */
interface UserSettings {
  tones?: Tone[];
}

/**
 * Service responsible for applying tones to system prompts.
 *
 * Handles:
 * - Loading user settings from file system
 * - Finding tone by ID
 * - Applying tone voice rules to system prompt
 */
export class ToneService {
  /**
   * Applies tone to the system prompt if a tone is specified in the latest user message.
   *
   * @param messages - The conversation messages
   * @param systemPrompt - The base system prompt
   * @param userId - The user ID (for loading settings)
   * @returns The system prompt with tone applied (if applicable)
   */
  public applyTone(
    messages: Message[],
    systemPrompt: string,
    userId: string,
  ): string {
    const latestUserMessage = messages.filter((m) => m.role === 'user').pop();

    if (!latestUserMessage?.toneId) {
      return systemPrompt;
    }

    try {
      const tone = this.loadTone(userId, latestUserMessage.toneId);

      if (tone?.voiceRules) {
        const enhancedPrompt = `${systemPrompt}\n\n# Writing Style\n${tone.voiceRules}`;
        console.log('[ToneService] Applied tone:', tone.name);
        return enhancedPrompt;
      }

      return systemPrompt;
    } catch (error) {
      console.error('[ToneService] Failed to apply tone:', error);
      // Continue without tone if there's an error
      return systemPrompt;
    }
  }

  /**
   * Loads a specific tone from user settings.
   *
   * @param userId - The user ID
   * @param toneId - The tone ID to load
   * @returns The tone if found, undefined otherwise
   */
  private loadTone(userId: string, toneId: string): Tone | undefined {
    const settingsPath = path.join(
      process.cwd(),
      'data',
      'users',
      userId,
      'settings.json',
    );

    if (!fs.existsSync(settingsPath)) {
      console.warn(`[ToneService] Settings file not found for user ${userId}`);
      return undefined;
    }

    const settings: UserSettings = JSON.parse(
      fs.readFileSync(settingsPath, 'utf-8'),
    );

    return settings.tones?.find((t) => t.id === toneId);
  }

  /**
   * Gets all available tones for a user.
   *
   * @param userId - The user ID
   * @returns Array of tones, empty array if none found
   */
  public getUserTones(userId: string): Tone[] {
    const settingsPath = path.join(
      process.cwd(),
      'data',
      'users',
      userId,
      'settings.json',
    );

    if (!fs.existsSync(settingsPath)) {
      return [];
    }

    try {
      const settings: UserSettings = JSON.parse(
        fs.readFileSync(settingsPath, 'utf-8'),
      );
      return settings.tones || [];
    } catch (error) {
      console.error('[ToneService] Failed to load user tones:', error);
      return [];
    }
  }
}
