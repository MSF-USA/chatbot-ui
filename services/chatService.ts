import {init, Tiktoken} from "@dqbd/tiktoken/lite/init";
import path from "path";
import fs from "fs";
import tiktokenModel from "@dqbd/tiktoken/encoders/cl100k_base.json";
import {
  APIM_CHAT_ENDPONT, AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST,
  OPENAI_API_VERSION
} from "@/utils/app/const";
import {ChatBody, FileMessageContent, Message, TextMessageContent} from "@/types/chat";
import {Readable} from "stream";
import {OpenAIStream, StreamingTextResponse} from "ai";
import OpenAI from "openai";
import {NextRequest} from "next/server";
import {checkIsModelValid, isFileConversation, isImageConversation} from "@/utils/app/chat";
import {OpenAIModelID, OpenAIVisionModelID} from "@/types/openai";
import {getMessagesToSend} from "@/utils/server/chat";
import {getToken} from "next-auth/jwt";
import {JWT} from "next-auth";


/**
 * ChatService class for handling chat-related API operations.
 */
export default class ChatService {
  /**
   * Initializes the Tiktoken tokenizer.
   * @returns {Promise<Tiktoken>} A promise that resolves to the initialized Tiktoken instance.
   */
  private async initTiktoken(): Promise<Tiktoken> {
    const wasmPath = path.resolve("./node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm");
    const wasmBuffer = fs.readFileSync(wasmPath);
    await init((imports) => WebAssembly.instantiate(wasmBuffer, imports));
    return new Tiktoken(tiktokenModel.bpe_ranks, tiktokenModel.special_tokens, tiktokenModel.pat_str);
  }

  /**
   * Retrieves the OpenAI API arguments based on the provided token and model.
   * @param {JWT} token - The JWT token for authentication.
   * @param {string} modelToUse - The ID of the model to use.
   * @returns {Promise<any>} A promise that resolves to the OpenAI API arguments.
   */
  private async getOpenAIArgs(token: JWT, modelToUse: string): Promise<any> {
    const openAIArgs: any = {
      baseURL: `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${modelToUse}`,
      defaultQuery: { "api-version": OPENAI_API_VERSION },
      defaultHeaders: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.accessToken}`,
      },
    };

    if (process.env.OPENAI_API_KEY) openAIArgs.apiKey = process.env.OPENAI_API_KEY;
    else openAIArgs.apiKey = "";

    return openAIArgs;
  }

  /**
   * Handles a file conversation by processing the file and returning a response.
   * @param {Message[]} messagesToSend - The messages to send in the conversation.
   * @returns {Promise<Response>} A promise that resolves to the response containing the processed file content.
   */
  private async handleFileConversation(messagesToSend: Message[]): Promise<Response> {
    const lastMessage: Message = messagesToSend[messagesToSend.length - 1];
    const content = lastMessage.content as Array<TextMessageContent | FileMessageContent>;

    let prompt: string | null = null;
    let fileUrl: string | null = null;
    content.forEach((section) => {
      if (section.type === "text") prompt = section.text;
      else if (section.type === "file_url") fileUrl = section.url;
      else throw new Error(`Unexpected content section type: ${JSON.stringify(section)}`);
    });

    if (!prompt) throw new Error("Could not find text content type!");
    if (!fileUrl) throw new Error("Could not find file URL!");

    const filename = (fileUrl as string).split("/").pop();
    if (!filename) throw new Error("Could not parse filename from URL!");
    const filePath = `/tmp/${filename}`;

    try {
      await this.downloadFile(fileUrl, filePath);
      console.log("File downloaded successfully.");

      const fileBuffer = fs.readFileSync(filePath);
      const file = new File([fileBuffer], filename, {});
      const responseString: string = ""; // await parseAndQueryFileLangchainOpenAI(file, prompt);

      console.log("File parsed successfully.");
      return new Response(JSON.stringify({ content: responseString }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing the file:", error);
      throw error;
    } finally {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Downloads a file from the specified URL and saves it to the specified file path.
   * @param {string} fileUrl - The URL of the file to download.
   * @param {string} filePath - The path where the downloaded file will be saved.
   * @returns {Promise<void>} A promise that resolves when the file is successfully downloaded.
   */
  private async downloadFile(fileUrl: string, filePath: string): Promise<void> {
    const response = await fetch(fileUrl);
    const fileStream = fs.createWriteStream(filePath);

    if (!response.body) throw new Error("Could not find file URL!");

    const readableStream = new ReadableStream({
      start(controller) {
        const reader = response.body!.getReader();
        function push() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            push();
          });
        }
        push();
      },
    });

    const nodeReadableStream = Readable.fromWeb(readableStream as any);
    const writableStream = fs.createWriteStream(filePath);

    await new Promise<void>((resolve, reject) => {
      nodeReadableStream.pipe(writableStream);
      writableStream.on("finish", resolve);
      writableStream.on("error", reject);
    });
  }

  /**
   * Handles a chat completion request by sending the messages to the OpenAI API and returning a streaming response.
   * @param {string} modelToUse - The ID of the model to use for the chat completion.
   * @param {Message[]} messagesToSend - The messages to send in the chat completion request.
   * @param {number} temperatureToUse - The temperature value to use for the chat completion.
   * @param {JWT} token - The JWT token for authentication.
   * @returns {Promise<StreamingTextResponse>} A promise that resolves to the streaming response containing the chat completion.
   */
  private async handleChatCompletion(
    modelToUse: string,
    messagesToSend: Message[],
    temperatureToUse: number,
    token: JWT
  ): Promise<StreamingTextResponse> {
    const openAIArgs = await this.getOpenAIArgs(token, modelToUse);
    const azureOpenai = new OpenAI(openAIArgs);
    const response = await azureOpenai.chat.completions.create({
      model: modelToUse,
      messages: messagesToSend as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: temperatureToUse,
      max_tokens: null,
      stream: true,
    });

    const stream: ReadableStream<any> = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  }

  /**
   * Handles an incoming request by processing the chat body and returning an appropriate response.
   * @param {NextRequest} req - The incoming Next.js request.
   * @returns {Promise<Response>} A promise that resolves to the response based on the request.
   */
  public async handleRequest(req: NextRequest): Promise<Response> {
    const { model, messages, prompt, temperature } = (await req.json()) as ChatBody;

    const encoding = await this.initTiktoken();
    const promptToSend = prompt || DEFAULT_SYSTEM_PROMPT;
    const temperatureToUse = temperature ?? DEFAULT_TEMPERATURE;

    const needsToHandleImages: boolean = isImageConversation(messages);
    const needsToHandleFiles: boolean = !needsToHandleImages && isFileConversation(messages);

    const isValidModel: boolean = checkIsModelValid(model.id, OpenAIModelID);
    const isImageModel: boolean = checkIsModelValid(model.id, OpenAIVisionModelID);

    let modelToUse = model.id;
    if (isValidModel && needsToHandleImages && !isImageModel) {
      modelToUse = "gpt-4o";
    } else if (modelToUse == null || !isValidModel) {
      modelToUse = AZURE_DEPLOYMENT_ID;
    }

    const prompt_tokens = encoding.encode(promptToSend);
    const messagesToSend: Message[] = await getMessagesToSend(
      messages,
      encoding,
      prompt_tokens.length,
      model.tokenLimit
    );
    encoding.free();

    const token= (await getToken({ req })) as JWT | null;
    if (!token) throw new Error("Could not pull token!");

    if (needsToHandleFiles) {
      return this.handleFileConversation(messagesToSend);
    } else {
      return this.handleChatCompletion(modelToUse, messagesToSend, temperatureToUse, token);
    }
  }
}
