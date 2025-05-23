import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { getStructuredResponse } from "@/utils/server/structuredResponses";
import { Message } from "@/types/chat";

// Define the response type for the title generation
type ChatTitleResponse = {
  title: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiVersion = '2024-08-01-preview';

  try {
    const body = await req.json();
    const { messages, user, modelId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided or invalid messages format" },
        { status: 400 }
      );
    }

    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      scope,
    );

    // Initialize OpenAI API client
    const openai = new AzureOpenAI({
      azureADTokenProvider,
      deployment: modelId,
      apiVersion,
    });

    // Prepare the prompt for title generation
    const prompt = `Generate a concise, descriptive title for this conversation. The title should be less than 50 characters and should capture the main topic or purpose of the conversation.`;

    const systemMessage = {
      role: "system",
      content: prompt,
    };

    // Generate title using structured response
    const jsonSchema = {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "A concise title for the conversation (less than 50 characters)",
        },
      },
      required: ["title"],
      additionalProperties: false,
    };

    const titleResponse = await getStructuredResponse<ChatTitleResponse>(
      openai,
      [systemMessage, ...messages],
      modelId,
      user,
      jsonSchema,
      0.7, // temperature
      100  // maxTokens - small value since we only need a short title
    );

    return NextResponse.json(
      { title: titleResponse.title },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
