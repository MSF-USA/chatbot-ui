import {makeAPIMRequestWithRetry} from "@/utils/server/apim";
import {getToken} from "next-auth/jwt";
import {JWT} from "next-auth";
import {ApimChatResponseDataStructure} from "@/types/apim";

interface parseAndQueryFilterOpenAIArguments {
    file: File;
    prompt: string;
    token: JWT;
}

/**
 * Parses a file and queries APIM with the file content and prompt.
 * @param {ParseAndQueryFilterOpenAIArguments} args - The arguments for parsing and querying.
 * @returns {Promise<string>} - The response from the OpenAI API.
 */
export async function parseAndQueryFileOpenAI({file, prompt, token}: parseAndQueryFilterOpenAIArguments): Promise<string> {
    const fileContent = await file.text();

    const chunks: string[] = splitIntoChunks(fileContent);

    const summarizationEndpoint: string = ''

    const summaries: string[] = await Promise.all(chunks.map(async (chunk: string): Promise<string> => {
        const summaryPrompt = `Summarize the following text with relevance to the prompt: ${prompt}\n\n${chunk}`;
        const summaryResponse: ApimChatResponseDataStructure = await makeAPIMRequestWithRetry(
            summarizationEndpoint,
            token.accessToken,
            'POST',
            {
                model: 'text-davinci-003',
                prompt: summaryPrompt,
                max_tokens: 100,
            }
        );
        return summaryResponse.choices[0].message.content.trim();
    }));

    const combinedSummary: string = summaries.join(' ');

    const finalPrompt: string = `${combinedSummary}\n\nUser prompt: ${prompt}`;

    const response: ApimChatResponseDataStructure = await makeAPIMRequestWithRetry(
        summarizationEndpoint,
        token.accessToken,
        'POST',
        {
            model: 'text-davinci-003',
            prompt: finalPrompt,
            max_tokens: 150,
        }
    );

    return response.choices[0].message.content.trim();
}

function splitIntoChunks(text: string, chunkSize = 2000): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}
