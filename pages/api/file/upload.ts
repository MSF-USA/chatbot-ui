import { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import mime from 'mime-types';
import { AzureBlobStorage, BlobStorage } from "@/utils/server/blob";
import { getEnvVariable } from "@/utils/app/env";
import {getToken} from "next-auth/jwt";
import {JWT, Session} from "next-auth";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@/pages/api/auth/[...nextauth]";

const READABLE_FORMATS = ['.txt', '.csv', '.srt', '.vtt', '.json', '.log', ".xml", ".ini", ".markdown"];
/*
* This API endpoint should take a file, generate a text file, if needed & possible, upload both to blob storage
*/
const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token: JWT | null = await (getToken({req}) as Promise<JWT | null>)
  if (!token)
    throw new Error("Could not pull token!")

  const session: Session | null = await getServerSession(authOptions as any);
  if (!session) throw new Error("Failed to pull session!");

  // @ts-ignore
  const userId: string = session?.user?.id ?? token.userId ?? 'anonymous';



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
    const data = Buffer.concat(chunks);
    const dataString = data.toString('utf8');
    const splitData = dataString.split('\r\n\r\n');
    const fileContent = splitData[splitData.length - 1];
    const fileData = Buffer.from(fileContent, 'utf8');
    const remoteFilepath = `${userId}/uploads/files`

    if (READABLE_FORMATS.includes(`.${fileExtension}`) || (mimeType && mimeType.startsWith('text/'))) {
      try {
        const fileText = fileData.toString('utf8');

        let blobStorageClient: BlobStorage = new AzureBlobStorage(
          getEnvVariable({name: 'AZURE_BLOB_STORAGE_NAME', user: session.user}),
          getEnvVariable({name: 'AZURE_BLOB_STORAGE_KEY', user: session.user}),
          getEnvVariable(
            {
              name: 'AZURE_BLOB_STORAGE_CONTAINER',
              throwErrorOnFail: false,
              defaultValue: process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? '',
              user: session.user
            }
          ),
          session.user
        );

        const fileStream = Readable.from(fileData);
        await blobStorageClient.uploadStream(
            {
              blobName: `${remoteFilepath}/${sanitizedFilename}`,
              contentStream: fileStream,
              options: {
                metadata:{
                  mimeType: mimeType.toString()
                }
              }
            }
        );

        const textStream = Readable.from(fileText);
        const fileUrl: string = await blobStorageClient.uploadStream(
            {
              blobName: `${remoteFilepath}/${sanitizedFilename}.txt`,
              contentStream: textStream,
              options: {
                metadata:{
                  mimeType: 'plain/text'
                }
              }
            },
        );

        res.status(200).json({
          message: 'File uploaded successfully',
          filename: sanitizedFilename,
          fileText,
          fileUrl
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      try {
        let blobStorageClient: BlobStorage = new AzureBlobStorage(
            getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
            getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
            getEnvVariable(
                'AZURE_BLOB_STORAGE_CONTAINER',
                false,
                process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? ''
            ),
            session.user
        );

        const fileStream = Readable.from(fileData);
        const fileUrl: string = await blobStorageClient.uploadStream(
            {
                blobName: `${remoteFilepath}/${sanitizedFilename}`,
                contentStream: fileStream,
            }
        );

        res.status(200).json({
          message: 'File uploaded successfully',
          filename: sanitizedFilename,
          fileUrl
        });
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
