import {
  TranslationRequest,
  TranslationResponseData,
} from '@/types/translation';

import { apiClient } from '@/client/services';

/**
 * Response from the translation API
 */
export interface TranslationApiResponse {
  success: boolean;
  data?: TranslationResponseData;
  error?: string;
}

/**
 * Translates text to the specified target language using Azure OpenAI.
 *
 * @param request - Translation request parameters
 * @returns Promise resolving to the translation response
 * @throws Error if the API request fails
 *
 * @example
 * const result = await translateText({
 *   sourceText: 'Hello, world!',
 *   targetLocale: 'es',
 * });
 * console.log(result.data?.translatedText); // "¡Hola, mundo!"
 */
export const translateText = async (
  request: TranslationRequest,
): Promise<TranslationApiResponse> => {
  return apiClient.post<TranslationApiResponse>('/api/chat/translate', request);
};
