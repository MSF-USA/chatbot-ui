import {makeAPIMRequestWithRetry} from "@/utils/server/apim";
import {getToken} from "next-auth/jwt";
import {JWT} from "next-auth";
import {ApimChatResponseDataStructure} from "@/types/apim";
import {APIM_CHAT_ENDPONT, DEFAULT_SYSTEM_PROMPT, OPENAI_API_HOST, OPENAI_API_VERSION} from "@/utils/app/const";
import OpenAI from "openai";
import {OpenAIStream} from "ai";

interface parseAndQueryFilterOpenAIArguments {
    file: File;
    prompt: string;
    token: JWT;
    modelId: string;
    maxLength?: number;
}

/**
 * Parses a file and queries APIM with the file content and prompt.
 * @param {parseAndQueryFilterOpenAIArguments} args - The arguments for parsing and querying.
 * @returns {Promise<string>} - The response from the OpenAI API.
 */
export async function parseAndQueryFileOpenAI(
  {file, prompt, token, modelId, maxLength = 9000}: parseAndQueryFilterOpenAIArguments
): Promise<ReadableStream<any>> {
    const fileContent = await file.text();

    const chunks: string[] = splitIntoChunks(fileContent);

    const openAIArgs: any = {
        baseURL: `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${modelId}`,
        defaultQuery: { "api-version": OPENAI_API_VERSION },
        defaultHeaders: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.accessToken}`,
        },
    };

    if (process.env.OPENAI_API_KEY) openAIArgs.apiKey = process.env.OPENAI_API_KEY;
    else openAIArgs.apiKey = "";

    const azureOpenai = new OpenAI(openAIArgs);

    const summaries: string[] =  []
    for (const chunk of chunks) {
        const summaryPrompt: string = `Summarize the following text with relevance to the prompt: ${prompt}\n\n\`\`\`text\n${chunk}\n\`\`\``;
        const chunkSummary = await azureOpenai.chat.completions.create({
            model: modelId,
            messages: [
                {
                    role: "system",
                    content: "You are an AI Text summarizer. You take the prompt of a user and rather than conclusively answering, you pull together all the relevant information for that prompt in a particular chunk of text and reshape that into brief statements capturing the nuanced intent of the original text."
                },
                {
                    role: "user",
                    content: summaryPrompt
                }
            ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
            temperature: 0.1,
            max_tokens: null,
            // TODO: Support non-streaming as optional output
            stream: false,
        });
        const summary = chunkSummary?.choices?.[0]?.message?.content?.trim() ?? "";
        summaries.push(summary);

        if (summaries.join(' ').length >= maxLength) {
            break;
        }


        // return summaryResponse.choices[0].message.content.trim();
    }

    let combinedSummary: string = summaries.join(' ');

    while (combinedSummary.length > maxLength) {
        const newChunks: string[] = splitIntoChunks(combinedSummary, Math.floor(maxLength / 2));
        const newSummaries: string[] = [];

        for (const newChunk of newChunks) {
            const summaryPrompt: string = `Summarize the following text with relevance to the prompt: ${prompt}\n\n\`\`\`text\n${newChunk}\n\`\`\``;
            const chunkSummary = await azureOpenai.chat.completions.create({
                model: modelId,
                messages: [
                    {
                        role: "system",
                        content: "You are an AI Text summarizer. You take the prompt of a user and rather than conclusively answering, you pull together all the relevant information for that prompt in a particular chunk of text and reshape that into brief statements capturing the nuanced intent of the original text."
                    },
                    {
                        role: "user",
                        content: summaryPrompt
                    }
                ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
                temperature: 0.1,
                max_tokens: null,
                // TODO: Support non-streaming as optional output
                stream: false,
            });

            const summary = chunkSummary?.choices?.[0]?.message?.content?.trim() ?? "";
            newSummaries.push(summary);
        }

        combinedSummary = newSummaries.join(' ');
    }


    const finalPrompt: string = `${combinedSummary}\n\nUser prompt: ${prompt}`;

    const response = await azureOpenai.chat.completions.create({
        model: modelId,
        messages: [
            {
                role: "system",
                content: DEFAULT_SYSTEM_PROMPT
            },
            {
                role: "user",
                content: finalPrompt
            }
        ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0.1,
        max_tokens: null,
        stream: true,
    })

    const stream: ReadableStream<any> = OpenAIStream(response);
    return stream;
}

function splitIntoChunks(text: string, chunkSize: number = 2000): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}
