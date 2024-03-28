import { OPENAI_API_TYPE } from '../utils/app/const';

export interface OpenAIModel {
  id: string;
  name: string;
  maxLength: number; // maximum length of a message
  tokenLimit: number;
}

export enum OpenAIModelID {
  GPT_3_5 = 'gpt-3.5-turbo',
  GPT_35 = 'gpt-35-turbo',
  GPT_3_5_AZ = 'gpt-35-turbo-1106',
  GPT_3_5_16k = 'gpt-35-turbo-16k-0613',
  GPT_4 = 'gpt-4',
  GPT_4_0613 = 'gpt-4-0613',
  GPT_4_32K = 'gpt-4-32k-0613',
  GPT_4_TURBO = 'gpt-4-1106-Preview',
  // GPT_4_VISION = 'gpt-4-vision-preview',
}

// in case the `DEFAULT_MODEL` environment variable is not set or set to an unsupported model
export const fallbackModelID = OpenAIModelID.GPT_3_5;

export const OpenAIModels: Record<OpenAIModelID, OpenAIModel> = {
  [OpenAIModelID.GPT_3_5]: {
    id: OpenAIModelID.GPT_3_5,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [OpenAIModelID.GPT_35]: {
    id: OpenAIModelID.GPT_35,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [OpenAIModelID.GPT_3_5_AZ]: {
    id: OpenAIModelID.GPT_3_5_AZ,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
    [OpenAIModelID.GPT_3_5_16k]: {
        id: OpenAIModelID.GPT_3_5_16k,
        name: 'GPT-3.5-16k',
        maxLength: 48000,
        tokenLimit: 16000,
    },
  [OpenAIModelID.GPT_4]: {
    id: OpenAIModelID.GPT_4,
    name: 'GPT-4',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [OpenAIModelID.GPT_4_0613]: {
    id: OpenAIModelID.GPT_4_0613,
    name: 'GPT-4-0613',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [OpenAIModelID.GPT_4_32K]: {
    id: OpenAIModelID.GPT_4_32K,
    name: 'GPT-4-32K',
    maxLength: 96000,
    tokenLimit: 32000,
  },
  [OpenAIModelID.GPT_4_TURBO]: {
    id: OpenAIModelID.GPT_4_TURBO,
    name: 'GPT-4-Turbo (Preview)',
    maxLength: 128000,
    tokenLimit: 8000,
  },
  // [OpenAIModelID.GPT_4_VISION]: {
  //     id: OpenAIModelID.GPT_4_VISION,
  //     name: 'GPT-4-Vision (Preview)',
  //     maxLength: 128000,
  //     tokenLimit: 8000,
  // },
};
