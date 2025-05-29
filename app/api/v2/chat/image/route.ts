import { NextRequest, NextResponse } from "next/server";
import { Message } from "@/types/chat";
import { Session } from "next-auth";
import { ImageGenerationService, ImageGenerationOptions } from "@/services/imageService";

/**
 * Handles POST requests to generate images based on conversation context
 * @param req - The incoming request
 * @returns A response with the generated image information
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body
    const body = await req.json();
    const {
      messages,
      user,
      modelId,
      options = {}
    } = body as {
      messages: Message[],
      user: Session['user'],
      modelId: string,
      options?: ImageGenerationOptions
    };

    // Validate the messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided or invalid messages format" },
        { status: 400 }
      );
    }

    // Create an instance of the ImageGenerationService
    const imageService = new ImageGenerationService();

    // Generate the image
    const response = await imageService.generateImage(
      messages,
      user,
      modelId,
      options
    );

    return NextResponse.json(
      response,
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
