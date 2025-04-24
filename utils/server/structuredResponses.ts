import {AzureOpenAI, OpenAI} from "openai";
import { Session } from "next-auth";
import ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

type OptimizedQueryResponse = {
  optimizedQuery: string;
  optimizedQuestion: string;
};

/**
 * Generic function to get a structured response from OpenAI's API based on a provided JSON schema.
 * @param openai - Instance of AzureOpenAI.
 * @param messages - Array of message objects for the conversation.
 * @param modelId - The ID of the model to use.
 * @param user - User session information.
 * @param jsonSchema - The JSON schema defining the expected response format.
 * @param temperature - Sampling temperature.
 * @param maxTokens - Maximum number of tokens to generate.
 * @returns A promise that resolves to a structured response of type T.
 */
export async function getStructuredResponse<T>(
  openai: AzureOpenAI,
  messages: ChatCompletionMessageParam[],
  modelId: string,
  user: Session["user"],
  jsonSchema: Record<string, unknown> | undefined,
  temperature: number = 0.7,
  maxTokens: number = 500
): Promise<T> {
  const response = await openai.chat.completions.create({
    model: modelId,
    messages: messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "StructuredResponse",
        strict: true,
        schema: jsonSchema,
      },
    },
    temperature: temperature,
    max_tokens: maxTokens,
    user: JSON.stringify(user),
  });

  const content = response?.choices?.[0]?.message?.content?.trim() ?? "";

  try {
    const output = JSON.parse(content) as T;
    return output;
  } catch (error) {
    console.error("Failed to parse OpenAI response as JSON:", content);
    throw new Error("Failed to parse output");
  }
}

/**
 * Generates optimized search query and question from a user's raw question.
 * @param openai - Instance of AzureOpenAI.
 * @param question - The user's raw question.
 * @param user - User session information.
 * @param modelId - The ID of the model to use.
 * @returns A promise that resolves to an object containing the optimized query and question.
 */
export async function generateOptimizedQueryAndQuestion(
  openai: AzureOpenAI,
  question: string,
  user: Session["user"],
  modelId: string
): Promise<OptimizedQueryResponse> {
  const prompt = `Given the user's raw question, generate an optimized search query to find relevant data from a search engine and an optimized question, which will be passed to an AI along with the found web pages to give the user useful information. Do not ignore or discard parts of the user query. Assume that every aspect is important and provides context.

Make sure your responses are relevant to the user's original question and fit for their intended purpose. Try to understand the user's intent, but if the context is ambiguous keep that ambiguity in your revisions to avoid drifting from the user's needs. If the user asks for any dates relative to the present, the current date is ${new Date().toISOString()}. But this is a search query, which can handle concepts like 'recent', so only include specific dates if it is directly relevant to the request / response.

Make sure the values of your response matches whatever language the original question was submitted in. 

\`\`\`user-question
${question}
\`\`\`

Provide the output in JSON format with keys "optimizedQuery" and "optimizedQuestion".

Output format:
{
  "optimizedQuery": "...",
  "optimizedQuestion": "..."
}
`;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are an AI assistant that transforms user questions into optimized search queries and optimized questions for further processing.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const jsonSchema: Record<string, unknown> | undefined = {
    type: "object",
    properties: {
      optimizedQuery: {
        type: "string",
      },
      optimizedQuestion: {
        type: "string",
      },
    },
    required: ["optimizedQuery", "optimizedQuestion"],
    additionalProperties: false,
  };

  const response = await getStructuredResponse<OptimizedQueryResponse>(
    openai,
    messages,
    modelId,
    user,
    jsonSchema,
    0.7, // temperature
    500 // maxTokens
  );

  return response;
}
