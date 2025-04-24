
export interface OpenAIModel {
  id: string;
  name: string;
  maxLength: number; // maximum length of a message
  tokenLimit: number;
  temperature?: number;
  stream?: boolean;
}

export enum OpenAIModelID {
  GPT_3_5 = 'gpt-35-turbo',
  GPT_4o = 'gpt-4o',
  GPT_4o_mini = 'gpt-4o-mini',
  GPT_4 = 'gpt-4',
  GPT_45 = 'gpt-45',
  GPT_o1 = 'gpt-o1',
  GPT_o1_mini = 'gpt-o1-mini',
  GPT_o3_mini = 'o3-mini',
}

export enum OpenAIVisionModelID {
  GPT_4o = "gpt-4o",
  GPT_4_VISION = 'gpt-4-vision-preview',
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
  [OpenAIModelID.GPT_4]: {
    id: OpenAIModelID.GPT_4,
    name: 'GPT-4',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [OpenAIModelID.GPT_4o]: {
    id: OpenAIModelID.GPT_4o,
    name: 'GPT-4o',
    maxLength: 80000,
    tokenLimit: 8000,
  },
  [OpenAIModelID.GPT_4o_mini]: {
    id: OpenAIModelID.GPT_4o_mini,
    name: 'GPT-4o-mini',
    maxLength: 80000,
    tokenLimit: 8000,
  },
  [OpenAIModelID.GPT_45]: {
    id: OpenAIModelID.GPT_45,
    name: 'gpt-4.5-preview',
    maxLength: 80000,
    tokenLimit: 8000,
  },
  [OpenAIModelID.GPT_o1]: {
    id: OpenAIModelID.GPT_o1,
    name: 'o1',
    maxLength: 80000,
    tokenLimit: 8000,
    stream: false,
    temperature: 1,
  },
  [OpenAIModelID.GPT_o1_mini]: {
    id: OpenAIModelID.GPT_o1_mini,
    name: 'o1-mini',
    maxLength: 80000,
    tokenLimit: 8000,
    stream: false,
    temperature: 1,
  },
  [OpenAIModelID.GPT_o3_mini]: {
    id: OpenAIModelID.GPT_o3_mini,
    name: 'o3-mini',
    maxLength: 80000,
    tokenLimit: 8000,
    stream: false,
    temperature: 1,
  }
};
