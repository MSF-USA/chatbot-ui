import { Plugin, PluginID } from '@/types/plugin';

interface GetEndpointArgs {
  plugin?: Plugin | undefined | null;
}

export const getEndpoint = ({plugin}: GetEndpointArgs) => {
  if (plugin?.id === PluginID.GOOGLE_SEARCH) {
    throw new Error('Google Plugin no longer supported.')
  }

  return 'api/v2/chat';
};
