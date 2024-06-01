import {AzureOpenAIInput, AzureChatOpenAI} from '@langchain/openai';
import {AIMessageChunk} from "@langchain/core/messages";

const splitIntoChunks = (text: string, chunkSize: number = 2000): string[] => {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

export async function parseAndQueryFileLangchainOpenAI(file: File, prompt: string): Promise<string> {
    const fileContent: string = await file.text();

    const openaiConfig: AzureOpenAIInput = {
        azureOpenAIApiDeploymentName: '',
        azureOpenAIBasePath: '',
        azureOpenAIApiInstanceName: '',
        azureOpenAIApiKey: '',
    }
    const openai: AzureChatOpenAI = new AzureChatOpenAI(openaiConfig);

    const chunks: string[] = splitIntoChunks(fileContent);

    const summaries: string[] = await Promise.all(chunks.map(async (chunk: string) => {
        const summaryPrompt: string = `Summarize the following text with relevance to the prompt: ${prompt}\n\n${chunk}`;
        const summaryResponse: AIMessageChunk = await openai.invoke(summaryPrompt);
        return summaryResponse.content.toString();
    }));

    const combinedSummary: string = summaries.join(' ');

    const finalPrompt: string = `${combinedSummary}\n\nUser prompt: ${prompt}`;

    const response: AIMessageChunk = await openai.invoke(finalPrompt);

    return response.content.toString();
}
