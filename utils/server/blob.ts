import {BlobServiceClient, BlockBlobUploadOptions, StorageSharedKeyCredential} from "@azure/storage-blob";
import {Readable} from "stream";
import fs from "fs/promises";

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
    upload(blobName: string, content: string, options?: BlockBlobUploadOptions | undefined): Promise<string>;
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
}


export class AzureBlobStorage implements BlobStorage {
    private blobServiceClient: BlobServiceClient;


    constructor(
        storageAccountName: string,
        storageAccountAccessKey: string,
        private containerName: string
    ) {
        const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, storageAccountAccessKey);
        this.blobServiceClient = new BlobServiceClient(
            `https://${storageAccountName}.blob.core.windows.net`,
            sharedKeyCredential
        );

    }

    async upload(blobName: string, content: string,  options?: BlockBlobUploadOptions | undefined): Promise<string> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        let safeContent: string;
        if (Array.isArray(content))
            safeContent = content[0]
        else
            safeContent = content

        await blockBlobClient.upload(safeContent, safeContent.length, options);
        return blockBlobClient.url;
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

    async get(blobName: string, property = BlobProperty.URL): Promise<string | Buffer> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (property === BlobProperty.URL) {
            return blockBlobClient.url;
        } else if (property === BlobProperty.BLOB) {
            try {
                const localFilename = blobName.split('/')[blobName.split('/').length - 1];
                const tempFilePath = `/tmp/${localFilename}`;
                await blockBlobClient.downloadToFile(tempFilePath, 0);

                const fileContent: Buffer = await fs.readFile(tempFilePath);
                await fs.unlink(tempFilePath);

                return fileContent;
            } catch (error) {
                console.error('Error downloading blob:', error);
                throw error;
            }
        } else {
            throw new Error("Invalid property type specified.");
        }
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

        await blockBlobClient.uploadStream(
            contentStream, bufferSize, maxConcurrency, options
        );
        return blockBlobClient.url;
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


export const createBlobStorageClient = (): BlobStorage => {
    return new AzureBlobStorage(
      process.env.AZURE_BLOB_STORAGE_NAME ?? '',
      process.env.AZURE_BLOB_STORAGE_KEY ?? '',
      process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? 'files'
    );
}

export const getBlobBase64String = async (userId: string, id: string): Promise<string> => {
    const blobStorageClient: BlobStorage = createBlobStorageClient();
    const blobLocation: string = `${userId}/uploads/images/${id}`;
    const blob: Buffer = await (blobStorageClient.get(blobLocation, BlobProperty.BLOB) as Promise<Buffer>);
    const base64String: string = blob.toString();
    return base64String;
}
