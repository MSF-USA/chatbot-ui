import {makeAPIMRequestWithRetry} from "@/utils/server/apim";
import {getToken} from "next-auth/jwt";
import {JWT} from "next-auth";
import {ApimChatResponseDataStructure} from "@/types/apim";

interface parseAndQueryFilteOpenAIArguments {
    file: File;
    prompt: string;
    token: JWT;
}

export async function parseAndQueryFileOpenAI({file, prompt, token}: parseAndQueryFilteOpenAIArguments): Promise<string> {
    const fileContent = await file.text();

    const chunks = splitIntoChunks(fileContent);

    const summarizationEndpoint: string = ''

    const summaries = await Promise.all(chunks.map(async (chunk) => {
        const summaryPrompt = `Summarize the following text with relevance to the prompt: ${prompt}\n\n${chunk}`;
        const summaryResponse = await makeAPIMRequestWithRetry(
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

    const combinedSummary = summaries.join(' ');

    const finalPrompt = `${combinedSummary}\n\nUser prompt: ${prompt}`;

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

function splitIntoChunks(text: string, chunkSize = 2000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}
