import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import {DefaultAzureCredential, getBearerTokenProvider} from "@azure/identity";
import {generateOptimizedQueryAndQuestion} from "@/utils/server/structuredResponses";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiVersion = '2024-08-01-preview'
  try {
    const body = await req.json();
    const { question, user, modelId } = body;

    if (!question) {
      return NextResponse.json(
        { error: "No question provided" },
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

    // Generate optimized query and question
    const { optimizedQuery, optimizedQuestion } =
      await generateOptimizedQueryAndQuestion(openai, question, user, modelId);

    return NextResponse.json(
      { optimizedQuery, optimizedQuestion },
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
