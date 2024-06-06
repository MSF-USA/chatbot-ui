import {BlobServiceClient, BlockBlobUploadOptions, StorageSharedKeyCredential} from "@azure/storage-blob";
import {Readable} from "stream";

enum BlobProperty {
    URL = 'url',
    BLOB = 'blob'
}

enum BlobStorageType {
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
    get(blobName: string, property: BlobProperty): Promise<string | Blob>;
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

    async get(blobName: string, property = BlobProperty.URL): Promise<string | Blob> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if(property === BlobProperty.URL) {
            return blockBlobClient.url;
        }
        else if(property === BlobProperty.BLOB) {
            const downloadBlockBlobResponse = await blockBlobClient.download(0);
            if (downloadBlockBlobResponse !== undefined) {
                const blobBody = await downloadBlockBlobResponse.blobBody
                if (blobBody !== undefined) {
                    const blob = await this.blobToString(blobBody);
                    return blob;
                } else {
                    throw new Error("Error downloading the blob body.")
                }
            } else {
                throw new Error("Blob not found.");
            }
        } else {
            throw new Error("Invalid property type specified.")
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
