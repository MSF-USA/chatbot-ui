import {BlobServiceClient, StorageSharedKeyCredential} from "@azure/storage-blob";
import Error from "next/error";

enum BlobProperty {
    URL = 'url',
    BLOB = 'blob'
}

interface BlobStorage {
    upload(blobName: string, content: string): Promise<string>;
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
        const blobServiceClient = new BlobServiceClient(
            `https://${storageAccountName}.blob.core.windows.net`,
            sharedKeyCredential
        );

        this.blobServiceClient = blobServiceClient;
    }

    async upload(blobName: string, content: string): Promise<string> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(content, content.length);
        return blockBlobClient.url;
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
                const blob = await this.blobToString(await downloadBlockBlobResponse.blobBody);
                return blob;
            } else {
                throw Error("Blob not found.");
            }
        } else {
            throw Error("Invalid property type specified.")
        }
    }
}

export default class BlobStorageFactory {
    static createAzureBlobStorage(storageAccountName: string, storageAccountAccessKey: string, containerName: string): BlobStorage | AzureBlobStorage {
        return new AzureBlobStorage(storageAccountName, storageAccountAccessKey, containerName);
    }
}
