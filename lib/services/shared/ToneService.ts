import { Message } from '@/types/chat';

import { SpanStatusCode, trace } from '@opentelemetry/api';
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
  private tracer = trace.getTracer('tone-service');
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
    return this.tracer.startActiveSpan(
      'tone.apply',
      {
        attributes: {
          'user.id': userId,
          'tone.has_tone_id': false, // Will be updated if tone is found
        },
      },
      (span) => {
        try {
          const latestUserMessage = messages
            .filter((m) => m.role === 'user')
            .pop();

          if (!latestUserMessage?.toneId) {
            span.setAttribute('tone.applied', false);
            span.setAttribute('tone.reason', 'no_tone_id');
            span.setStatus({ code: SpanStatusCode.OK });
            return systemPrompt;
          }

          span.setAttribute('tone.has_tone_id', true);
          span.setAttribute('tone.id', latestUserMessage.toneId);

          const tone = this.loadTone(userId, latestUserMessage.toneId);

          if (tone?.voiceRules) {
            const enhancedPrompt = `${systemPrompt}\n\n# Writing Style\n${tone.voiceRules}`;
            console.log('[ToneService] Applied tone:', tone.name);

            span.setAttribute('tone.applied', true);
            span.setAttribute('tone.name', tone.name);
            span.setAttribute(
              'tone.voice_rules_length',
              tone.voiceRules.length,
            );
            span.setStatus({ code: SpanStatusCode.OK });

            return enhancedPrompt;
          }

          span.setAttribute('tone.applied', false);
          span.setAttribute('tone.reason', 'no_voice_rules');
          span.setStatus({ code: SpanStatusCode.OK });

          return systemPrompt;
        } catch (error) {
          console.error('[ToneService] Failed to apply tone:', error);
          span.recordException(error as Error);
          span.setAttribute('tone.applied', false);
          span.setAttribute('tone.reason', 'error');
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue without tone if there's an error
          return systemPrompt;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Loads a specific tone from user settings.
   *
   * @param userId - The user ID
   * @param toneId - The tone ID to load
   * @returns The tone if found, undefined otherwise
   */
  public loadTone(userId: string, toneId: string): Tone | undefined {
    return this.tracer.startActiveSpan(
      'tone.load',
      {
        attributes: {
          'user.id': userId,
          'tone.id': toneId,
        },
      },
      (span) => {
        try {
          const settingsPath = path.join(
            process.cwd(),
            'data',
            'users',
            userId,
            'settings.json',
          );

          if (!fs.existsSync(settingsPath)) {
            console.warn(
              `[ToneService] Settings file not found for user ${userId}`,
            );
            span.setAttribute('tone.found', false);
            span.setAttribute('tone.reason', 'settings_file_not_found');
            span.setStatus({ code: SpanStatusCode.OK });
            return undefined;
          }

          const settings: UserSettings = JSON.parse(
            fs.readFileSync(settingsPath, 'utf-8'),
          );

          const tone = settings.tones?.find((t) => t.id === toneId);

          span.setAttribute('tone.found', !!tone);
          if (tone) {
            span.setAttribute('tone.name', tone.name);
          } else {
            span.setAttribute('tone.reason', 'tone_id_not_found');
          }
          span.setStatus({ code: SpanStatusCode.OK });

          return tone;
        } catch (error) {
          span.recordException(error as Error);
          span.setAttribute('tone.found', false);
          span.setAttribute('tone.reason', 'error');
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Gets all available tones for a user.
   *
   * @param userId - The user ID
   * @returns Array of tones, empty array if none found
   */
  public getUserTones(userId: string): Tone[] {
    return this.tracer.startActiveSpan(
      'tone.get_user_tones',
      {
        attributes: {
          'user.id': userId,
        },
      },
      (span) => {
        try {
          const settingsPath = path.join(
            process.cwd(),
            'data',
            'users',
            userId,
            'settings.json',
          );

          if (!fs.existsSync(settingsPath)) {
            span.setAttribute('tone.count', 0);
            span.setAttribute('tone.reason', 'settings_file_not_found');
            span.setStatus({ code: SpanStatusCode.OK });
            return [];
          }

          const settings: UserSettings = JSON.parse(
            fs.readFileSync(settingsPath, 'utf-8'),
          );
          const tones = settings.tones || [];

          span.setAttribute('tone.count', tones.length);
          span.setStatus({ code: SpanStatusCode.OK });

          return tones;
        } catch (error) {
          console.error('[ToneService] Failed to load user tones:', error);
          span.recordException(error as Error);
          span.setAttribute('tone.count', 0);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          return [];
        } finally {
          span.end();
        }
      },
    );
  }
}
