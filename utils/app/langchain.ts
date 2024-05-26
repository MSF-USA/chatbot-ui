import {AzureOpenAIInput, AzureChatOpenAI} from '@langchain/openai';
import {AIMessageChunk} from "@langchain/core/messages";

const splitIntoChunks = (text: string, chunkSize: number = 2000) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

export async function parseAndQueryFileOpenAI(file: File, prompt: string): Promise<any> {
    const fileContent: string = await file.text();

    const openaiConfig: AzureOpenAIInput = {
        azureOpenAIApiDeploymentName: '',
        azureOpenAIBasePath: '',
        azureOpenAIApiInstanceName: '',
        azureOpenAIApiKey: '',
    }
    const openai: AzureChatOpenAI = new AzureChatOpenAI(openaiConfig);

    const chunks: string[] = splitIntoChunks(fileContent);

    const summaries = await Promise.all(chunks.map(async (chunk: string) => {
        const summaryPrompt: string = `Summarize the following text with relevance to the prompt: ${prompt}\n\n${chunk}`;
        const summaryResponse = await openai.invoke(summaryPrompt);
        return summaryResponse.content.toString();
    }));

    const combinedSummary = summaries.join(' ');

    const finalPrompt = `${combinedSummary}\n\nUser prompt: ${prompt}`;

    const response: AIMessageChunk = await openai.invoke(finalPrompt);

    return response.content.toString();
}

