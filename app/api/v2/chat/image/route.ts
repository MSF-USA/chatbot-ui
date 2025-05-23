import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { getStructuredResponse } from "@/utils/server/structuredResponses";
import { FileMessageContent, ImageMessageContent, Message, TextMessageContent } from "@/types/chat";
import { Session } from "next-auth";
import {isValidUrl} from "@/utils/server/url-validator";

// Define the response type for the image generation
type ImageGenerationResponse = {
  title: string;
  fullTitle: string;
  imageUrl: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiVersion = '2024-08-01-preview'; // Using the same API version as in the title endpoint

  try {
    const body = await req.json();
    const { messages, user, modelId } = body as { messages: Message[], user: Session['user'], modelId: string };

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

    // Initialize OpenAI API client for structured response
    const openaiChat = new AzureOpenAI({
      azureADTokenProvider,
      deployment: modelId,
      apiVersion,
    });

    // Initialize OpenAI API client for image generation
    const openaiImage = new AzureOpenAI({
      azureADTokenProvider,
      deployment: 'dall-e-3', // Using DALL-E 3 for image generation
      apiVersion,
    });

    // Filter messages to only include TextMessageContent
    const filteredMessages = messages.map(message => {
      // Handle string content
      if (typeof message.content === 'string') {
        return message;
      }

      // Handle array content - filter to only include text content
      if (Array.isArray(message.content)) {
        const textContents = (
          message.content as (TextMessageContent | FileMessageContent | ImageMessageContent)[]
        ).filter(
          (item: TextMessageContent | FileMessageContent | ImageMessageContent) => item.type === 'text'
        ) as TextMessageContent[];

        return {
          ...message,
          content: textContents.length > 0 ? textContents : [{ type: 'text', text: '' }]
        };
      }

      // Handle object content - only include if it's text type
      if (typeof message.content === 'object' && message.content !== null) {
        if ((message.content as TextMessageContent).type === 'text') {
          return message;
        } else {
          // Replace non-text content with empty text
          return {
            ...message,
            content: { type: 'text', text: '' }
          };
        }
      }

      return message;
    });

    // First, generate a title and prompt for the image using structured response
    const jsonSchema = {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "A concise title for the image (less than 50 characters)",
        },
        prompt: {
          type: "string",
          description: "A detailed prompt for generating the image based on the conversation",
        },
      },
      required: ["title", "prompt"],
      additionalProperties: false,
    };

    // Create a system message for generating the title and prompt
    const systemMessage = {
      role: "system",
      content: `You are an AI assistant that helps generate images. Based on the conversation, generate a concise title (less than 50 characters) and a detailed prompt for creating an image.
      The title should be descriptive but brief, capturing the main subject or theme of the desired image.
      The prompt should be detailed and specific, describing the visual elements, style, mood, and composition that would make an effective image based on the conversation.
      Focus on what the user is trying to visualize or create.`,
    };

    // Get structured response for title and prompt
    const structuredResponse = await getStructuredResponse<{ title: string, prompt: string }>(
      openaiChat,
      // @ts-ignore
      [systemMessage, ...filteredMessages],
      modelId, // Using the model ID from the request
      user,
      jsonSchema,
      0.7, // temperature
      200  // maxTokens - moderate value since we need both title and prompt
    );

    // Generate the image using the prompt
    const imageResults = await openaiImage.images.generate({
      prompt: structuredResponse.prompt,
      size: "1024x1024",
      n: 1,
      model: "", // This is left empty as per the Microsoft example
      style: "vivid", // Using vivid style as default
    });

    // Get the image URL from the response
    const imageUrl = imageResults?.data?.[0]?.url || "";

    if (!imageUrl || !isValidUrl(imageUrl)) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    // Create the response object
    const response: ImageGenerationResponse = {
      title: structuredResponse.title.slice(0, 49), // Ensuring title is less than 50 characters
      fullTitle: structuredResponse.title,
      imageUrl: imageUrl
    };

    return NextResponse.json(
      response,
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
