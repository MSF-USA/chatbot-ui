import { AzureOpenAIInput, AzureChatOpenAI } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PromptTemplate, ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import {Document} from "@langchain/core/documents";
import { LLMChain } from 'langchain/chains';
import { lookup } from 'mime-types';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import {ChainValues} from "@langchain/core/dist/utils/types";
import {EPubLoader} from "@langchain/community/dist/document_loaders/fs/epub";
import {JSONLoader} from "langchain/dist/document_loaders/fs/json";
import {CSVLoader} from "langchain/dist/document_loaders/fs/csv";
import {APIM_CHAT_ENDPONT, OPENAI_API_HOST} from "@/utils/app/const";

const openaiConfig: AzureOpenAIInput = {
    azureOpenAIApiDeploymentName: APIM_CHAT_ENDPONT,
    azureOpenAIBasePath:  `${OPENAI_API_HOST}`,
    azureOpenAIApiKey: '',
    azureOpenAIApiVersion: '',
};

const openai: AzureChatOpenAI = new AzureChatOpenAI(openaiConfig);

const summaryTemplate = new PromptTemplate({
    template: 'Summarize the following text with relevance to the prompt: {prompt}\n\n{chunk}',
    inputVariables: ['chunk', 'prompt'],
});

const summaryChain = new LLMChain({
    llm: openai,
    prompt: summaryTemplate,
});

const qaTemplate = ChatPromptTemplate.fromMessages([
    HumanMessagePromptTemplate.fromTemplate('{summary}\n\nUser prompt: {prompt}'),
]);

const qaChain: LLMChain<string, AzureChatOpenAI> = new LLMChain({
    llm: openai,
    prompt: qaTemplate,
});

async function loadDocument(file: File): Promise<string> {
    const mimeType = lookup(file.name) || 'application/octet-stream';
    let loader;

    switch (true) {
        case mimeType.startsWith('application/pdf'):
            loader = new PDFLoader(file);
            break;
        case mimeType.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document'):
            loader = new DocxLoader(file);
            break;
        case mimeType.startsWith('text/plain') || mimeType.startsWith('text/'):
            loader = new TextLoader(file);
            break;
        case mimeType.startsWith('text/csv') || mimeType.startsWith('application/csv'):
            loader = new CSVLoader(file);
            break;
        case mimeType.startsWith('application/json'):
            loader = new JSONLoader(file);
            break;
        // case mimeType.startsWith('application/epub+zip'):
        //     loader = new EPubLoader(file);
        //     break;
        // case mimeType.startsWith('text/html') || mimeType.startsWith('application/xhtml+xml'):
        //     loader = new HTMLLoader(file);
        //     break;
        default:
            throw new Error('Unsupported file type');
    }

    const docs = await loader.load();
    return docs[0].pageContent;
}


async function splitDocument(text: string, chunkSize: number = 2000): Promise<string[]> {
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize });
    return await textSplitter.splitText(text);
}

async function summarizeChunks(chunks: string[], prompt: string): Promise<ChainValues[]> {
    return await Promise.all(
      chunks.map((chunk: string) => summaryChain.call({ chunk, prompt }))
    );
}

async function combineSummaries(summaries: ChainValues[]): Promise<string> {
    return summaries.map((summary: ChainValues) => summary.text).join(' ');
}

async function answerQuestion(summary: string, prompt: string): Promise<string> {
    const response: ChainValues = await qaChain.call({
        summary,
        prompt,
    });
    return response.text;
}

export async function parseAndQueryFileLangchainOpenAI(file: File, prompt: string, chunkSize: number = 2000): Promise<string> {
    const text: string = await loadDocument(file);
    const chunks: string[] = await splitDocument(text, chunkSize);
    const summaries: ChainValues[] = await summarizeChunks(chunks, prompt);
    const combinedSummary: string = await combineSummaries(summaries);
    const answer: string = await answerQuestion(combinedSummary, prompt);
    return answer;
}
