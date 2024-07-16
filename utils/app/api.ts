import { Plugin, PluginID } from '@/types/plugin';

export const getEndpoint = (plugin: Plugin | null) => {
  if (plugin?.id === PluginID.GOOGLE_SEARCH) {
    throw new Error('Google Plugin no longer supported.')
  }

  return 'api/v2/chat';
};
