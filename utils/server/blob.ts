import {BlobServiceClient, BlockBlobUploadOptions, StorageSharedKeyCredential} from "@azure/storage-blob";
import {Readable} from "stream";
import fs from "fs/promises";
import {getEnvVariable} from "@/utils/app/env";
import {lookup} from "mime-types";

export enum BlobProperty {
    URL = 'url',
    BLOB = 'blob'
}

export enum BlobStorageType {
    AZURE = 'azure',
    AWS = 'aws'
}

export interface UploadStreamAzureStorageArgs {
    blobName: string;
    contentStream: Readable;
    bufferSize?: number | undefined;
    maxConcurrency?: number | undefined;
    options?: BlockBlobUploadOptions | undefined;
}

export interface BlobStorage {
    upload(blobName: string, content: string | Buffer, options?: BlockBlobUploadOptions | undefined): Promise<string>;
    uploadStream(
        {
            blobName,
            contentStream,
            bufferSize,
            maxConcurrency,
            options
        }: UploadStreamAzureStorageArgs
    ): Promise<string>;
    get(blobName: string, property: BlobProperty): Promise<string | Blob | Buffer>;
    blobExists(blobName: string): Promise<boolean>;
}

export class AzureBlobStorage implements BlobStorage {
    private blobServiceClient: BlobServiceClient;

    constructor(
      storageAccountName: string = getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
      storageAccountAccessKey: string = getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
      private containerName: string = getEnvVariable(
          'AZURE_BLOB_STORAGE_CONTAINER',
          false,
          process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? ''
      )
    ) {
        const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, storageAccountAccessKey);
        this.blobServiceClient = new BlobServiceClient(
          `https://${storageAccountName}.blob.core.windows.net`,
          sharedKeyCredential
        );
    }

    async upload(blobName: string, content: string | Buffer, options?: BlockBlobUploadOptions | undefined): Promise<string> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (await this.blobExists(blobName)) {
            return blockBlobClient.url;
        }

        let uploadContent: string | Buffer;
        let contentLength: number;

        if (Buffer.isBuffer(content)) {
            uploadContent = content;
            contentLength = content.length;
        } else if (typeof content === 'string') {
            uploadContent = content;
            contentLength = Buffer.byteLength(content);
        } else if (Array.isArray(content)) {
            uploadContent = content[0];
            contentLength = Buffer.byteLength(content[0]);
        } else {
            throw new Error('Invalid content type. Expected string, Buffer, or array of strings.');
        }

        await blockBlobClient.upload(uploadContent, contentLength, options);
        return blockBlobClient.url;
    }

    async uploadStream(
      {
          blobName,
          contentStream,
          bufferSize,
          maxConcurrency,
          options
      }: UploadStreamAzureStorageArgs
    ): Promise<string> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (await this.blobExists(blobName)) {
            return blockBlobClient.url;
        }

        await blockBlobClient.uploadStream(
          contentStream, bufferSize, maxConcurrency, options
        );
        return blockBlobClient.url;
    }

    async get(blobName: string, property = BlobProperty.URL): Promise<string | Buffer> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (property === BlobProperty.URL) {
            return blockBlobClient.url;
        } else if (property === BlobProperty.BLOB) {
            try {
                const downloadResponse = await blockBlobClient.download();

                if (!downloadResponse.readableStreamBody) {
                    throw new Error('No readable stream available');
                }

                return this.streamToBuffer(downloadResponse.readableStreamBody);
            } catch (error) {
                console.error('Error downloading blob:', error);
                throw error;
            }
        } else {
            throw new Error("Invalid property type specified.");
        }
    }

    async blobExists(blobName: string): Promise<boolean> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        return blockBlobClient.exists();
    }

    async createContainer(containerName: string): Promise<void> {
        await this.blobServiceClient.createContainer(containerName)
    }

    async blobToString(blob: Blob): Promise<string> {
        const fileReader = new FileReader();
        return new Promise<string>((resolve, reject) => {
            fileReader.onloadend = (ev: any) => {
                resolve(ev.target!.result as string);
            };
            fileReader.onerror = reject;
            fileReader.readAsText(blob);
        });
    }

    private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            readableStream.on('data', (data) => {
                chunks.push(data instanceof Buffer ? data : Buffer.from(data));
            });
            readableStream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            readableStream.on('error', reject);
        });
    }

}

export default class BlobStorageFactory {
    static createAzureBlobStorage(
      storageAccountName: string, storageAccountAccessKey: string,
      containerName: string, type: BlobStorageType = BlobStorageType.AZURE
    ): BlobStorage | AzureBlobStorage {
        switch (type) {
            case BlobStorageType.AZURE:
                return new AzureBlobStorage(storageAccountName, storageAccountAccessKey, containerName);
            case BlobStorageType.AWS:
                throw new Error("AWS blob storage support not implemented.")
            default:
                throw new Error(`Invalid blob storage type provided: ${type}`)
        }
    }
}

type BlobType = 'files' | 'images' | 'audio' | 'video';

export const getBlobBase64String = async (userId: string, id: string, blobType: BlobType = 'images'): Promise<string> => {
    const blobStorageClient: BlobStorage = new AzureBlobStorage(
      process.env.AZURE_BLOB_STORAGE_NAME ?? '',
      process.env.AZURE_BLOB_STORAGE_KEY ?? '',
      process.env.AZURE_BLOB_STORAGE_CONTAINER ?? process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? 'files'
    );
    const blobLocation: string = `${userId}/uploads/${blobType}/${id}`;
    const blob: Buffer = await (blobStorageClient.get(blobLocation, BlobProperty.BLOB) as Promise<Buffer>);
    const mimeType = lookup(blobLocation.split('.')[blobLocation.split('.').length-1]);

    let base64String: string;
    if (blobType === 'images') {
        base64String = blob.toString()
    } else {
        base64String = blob.toString('base64');
    }

    if (base64String.startsWith('data:')) {
        /* pass */
    } else if (mimeType) {
        const base64Content = base64String.split('base64')[base64String.split('base64').length - 1];
        base64String = `data:${mimeType};base64,${base64Content}`;
    } else {
        throw new Error(`Couldn't pull mime type: ${blobLocation}`);
    }

    return base64String;
}
