import {JWT} from "next-auth";
import {APIM_CHAT_ENDPONT, DEFAULT_SYSTEM_PROMPT, OPENAI_API_HOST, OPENAI_API_VERSION} from "@/utils/app/const";
import OpenAI from "openai";
import {OpenAIStream} from "ai";
import {lookup} from "mime-types";
import mammoth from 'mammoth';
import {DocxLoader} from "@langchain/community/document_loaders/fs/docx";
import pdfParse from 'pdf-parse'



interface parseAndQueryFilterOpenAIArguments {
    file: File;
    prompt: string;
    token: JWT;
    modelId: string;
    maxLength?: number;
}

async function loadPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // const data = await pdfParse(buffer);
    // return data.text;
    return "";
}

async function loadDOCX(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    try {
        const result = await mammoth.extractRawText({ arrayBuffer: uint8Array });
        return result.value;
    } catch (error: any) {
        console.error(`Error processing the DOCX file: ${error.message}`);
        throw error;
    }
}

async function loadDocument(file: File): Promise<string> {
    let text, content, loader;
    const mimeType = lookup(file.name) || 'application/octet-stream';

    switch (true) {
        case mimeType.startsWith('application/pdf'):
            text = await loadPDF(file);
            // loader = new PDFLoader(file);
            // content = await loader.load();
            // text = content[0].pageContent

            break;
        case mimeType.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document'):
            loader = new DocxLoader(file);
            content = await loader.load();
            text = content[0].pageContent
            break;
        case mimeType.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
            throw new Error("Not supported file type");
        case mimeType.startsWith('application/vnd.openxmlformats-officedocument.presentationml.presentation'):
            throw new Error("Not supported file type");
        case mimeType.startsWith('application/epub+zip'):
            throw new Error("Not supported file type");
        case mimeType.startsWith('text/plain') || mimeType.startsWith('text/') || mimeType.startsWith('application/csv')
        || mimeType.startsWith('application/json') || mimeType.startsWith('application/xhtml+xml'):
        default:
            try {
                text = await file.text()
            } catch (error) {
                console.error(`Could not parse text from ${file.name}`);
                throw error;
            }
    }
    return text;
}

async function summarizeChunk(
  azureOpenai: OpenAI,
  modelId: string,
  prompt: string,
  chunk: string
): Promise<string> {
    const summaryPrompt: string = `Summarize the following text with relevance to the prompt, but keep enough details to maintain the tone, character, and content of the original. If nothing is relevant, then return an empty string:\n\n\`\`\`prompt\n${prompt}\`\`\`\n\n\`\`\`text\n${chunk}\n\`\`\``;
    const chunkSummary = await azureOpenai.chat.completions.create({
        model: modelId,
        messages: [
            {
                role: "system",
                content: "You are an AI Text summarizer. You take the prompt of a user and rather than conclusively answering, you pull together all the relevant information for that prompt in a particular chunk of text and reshape that into brief statements capturing the nuanced intent of the original text. Focus on how the provided text answers the user's question. If it doesn't then briefly make that clear."
            },
            {
                role: "user",
                content: summaryPrompt
            }
        ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0.1,
        max_tokens: 1000,
        stream: false,
    });
    return chunkSummary?.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function parseAndQueryFileOpenAI(
  {file, prompt, token, modelId, maxLength = 6000}: parseAndQueryFilterOpenAIArguments
): Promise<ReadableStream<any>> {
    const fileContent = await loadDocument(file);
    let chunks: string[] = splitIntoChunks(fileContent);

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

    let combinedSummary: string = "";

    while (chunks.length > 0) {
        const chunkPromises = chunks.map(chunk =>
          summarizeChunk(azureOpenai, modelId, prompt, chunk)
            .catch(error => {
                console.error(error);
                return null;
            })
        );

        const summaries = await Promise.all(chunkPromises);
        const validSummaries = summaries.filter(summary => summary !== null);

        let batchSummary = '';
        for (const summary of validSummaries) {
            if ((batchSummary + summary).length > maxLength) {
                break;
            }
            batchSummary += summary + ' ';
        }

        combinedSummary += batchSummary;
        chunks = chunks.slice(validSummaries.length);
    }

    const finalPrompt: string = `${combinedSummary}\n\nUser prompt: ${prompt}`;

    const response = await azureOpenai.chat.completions.create({
        model: modelId,
        messages: [
            {
                role: "system",
                content: "You are a document analyzer AI Assistant. You perform all tasks the user requests of you, careful to make sure you are responding to the spirit and intentions behind their request. You make it clear how your responses relate to the base text that you are processing and provide your responses in markdown format when special formatting is necessary. Understand that you are analyzing text that you have previously summarized, so make sure your response is an amalgamation of your impressions over each chunk."
            },
            {
                role: "user",
                content: finalPrompt
            }
        ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0.1,
        max_tokens: null,
        stream: true,
    });

    const stream: ReadableStream<any> = OpenAIStream(response);
    return stream;
}

function splitIntoChunks(text: string, chunkSize: number = 6000): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}
