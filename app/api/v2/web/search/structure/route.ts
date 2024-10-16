import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { Session } from "next-auth";
import {DefaultAzureCredential, getBearerTokenProvider} from "@azure/identity";

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

async function generateOptimizedQueryAndQuestion(
  openai: AzureOpenAI,
  question: string,
  user: Session["user"],
  modelId: string
): Promise<{ optimizedQuery: string; optimizedQuestion: string }> {
  const prompt = `Given the user's raw question, generate an optimized search query to find relevant data from a search engine and an optimized question, which will be passed to an AI along with the found web pages to give the user useful information.

Make sure your responses are relevant to the user's original question and fit for their intended purpose. Try to understand the user's intent, but if the context is ambiguous keep that ambiguity in your revisions to avoid drifting from the user's needs. If the user asks for any dates relative to the present, the current date is ${new Date().toISOString()}

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

  const response = await openai.chat.completions.create({
    model: modelId,
    messages: [
      {
        role: "system",
        content:
          "You are an AI assistant that transforms user questions into optimized search queries and optimized questions for further processing.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: 'ImprovedSearchQuery',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            optimizedQuery: {
              type: 'string'
            },
            optimizedQuestion: {
              type: 'string'
            }
          },
          required: [
            "optimizedQuery",
            "optimizedQuestion"
          ],
          additionalProperties: false
        },
      },
    },
    temperature: 0.7,
    max_tokens: 500,
    user: JSON.stringify(user),
  });

  const content = response?.choices?.[0]?.message?.content?.trim() ?? "";

  // Parse the output as JSON
  try {
    const output = JSON.parse(content);
    const { optimizedQuery, optimizedQuestion } = output;
    return { optimizedQuery, optimizedQuestion };
  } catch (error) {
    console.error("Failed to parse OpenAI response as JSON:", content);
    throw new Error("Failed to parse output");
  }
}
