import { headers } from 'next/headers';

import { OPENAI_API_HOST_TYPE } from '@/utils/app/const';

import { OpenAIModelID, fallbackModelID } from '@/types/openai';

import HomePage from './home-page';

async function getServerSideData() {
  const defaultModelId = (
    process.env.DEFAULT_MODEL &&
    Object.values(OpenAIModelID).includes(
      process.env.DEFAULT_MODEL as OpenAIModelID,
    )
      ? process.env.DEFAULT_MODEL
      : fallbackModelID
  ) as OpenAIModelID;

  let serverSidePluginKeysSet = false;

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCSEId = process.env.GOOGLE_CSE_ID;

  if (googleApiKey && googleCSEId) {
    serverSidePluginKeysSet = true;
  }

  const headersList = headers();
  const locale = headersList.get('x-locale') || 'en';

  return {
    serverSideApiKeyIsSet:
      !!process.env.OPENAI_API_KEY || OPENAI_API_HOST_TYPE === 'apim',
    defaultModelId,
    serverSidePluginKeysSet,
    locale,
  };
}
export default async function Page() {
  const serverData = await getServerSideData();
  return <HomePage {...serverData} />;
}
