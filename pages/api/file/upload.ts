import { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import mime from 'mime-types';
import { AzureBlobStorage, BlobStorage } from "@/utils/server/blob";
import { getEnvVariable } from "@/utils/app/env";
import {undefined} from "zod";
import {file} from "@babel/types";

const READABLE_FORMATS = ['.txt', '.csv', '.srt', '.vtt'];

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawFilename = req.headers['x-file-name'] as string;

  if (!rawFilename) {
    res.status(400).json({ error: 'Missing x-file-name header' });
    return;
  }

  const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '');
  const fileExtension = sanitizedFilename.toLowerCase().split('.').pop();
  const mimeType = mime.lookup(sanitizedFilename);

  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', async () => {
    const fileData = Buffer.concat(chunks);

    if (READABLE_FORMATS.includes(`.${fileExtension}`) || (mimeType && mimeType.startsWith('text/'))) {
      try {
        const fileText = fileData.toString('utf8');

        let blobStorageClient: BlobStorage = new AzureBlobStorage(
            getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
            getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
            getEnvVariable('AZURE_BLOB_STORAGE_FILE_CONTAINER') ?? 'files'
        );

        const fileStream = Readable.from(fileData);
        await blobStorageClient.uploadStream(
            {
              blobName: sanitizedFilename, contentStream: fileStream
            }
        );

        const textStream = Readable.from(fileText);
        await blobStorageClient.uploadStream(
            {
              blobName: `${sanitizedFilename}.txt`,
              contentStream: textStream
            },
        );

        res.status(200).json({ message: 'File uploaded successfully', filename: sanitizedFilename, fileText });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      try {
        let blobStorageClient: BlobStorage = new AzureBlobStorage(
            getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
            getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
            getEnvVariable('AZURE_BLOB_STORAGE_FILE_CONTAINER') ?? 'files'
        );

        const fileStream = Readable.from(fileData);
        await blobStorageClient.uploadStream(
            {
               blobName: sanitizedFilename,
              contentStream: fileStream
            }
        );

        res.status(200).json({ message: 'File uploaded successfully', filename: sanitizedFilename });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  req.on('error', (err: Error) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
