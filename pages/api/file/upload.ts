import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';

const READABLE_FORMATS = ['.txt', '.csv', '.srt', '.vtt'];

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const tempDirectory = os.tmpdir();
  const filename = req.headers['x-file-name'] as string;
  const tempFilePath = path.join(tempDirectory, filename);

  const fileStream = fs.createWriteStream(tempFilePath);

  req.on('data', (chunk: Buffer) => {
    fileStream.write(chunk);
  });

  req.on('end', () => {
    fileStream.end();

    const fileExtension = path.extname(filename).toLowerCase();
    if (READABLE_FORMATS.includes(fileExtension)) {
      // Read the contents of the file
      fs.readFile(tempFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: 'Internal server error' });
          cleanupTempFile(tempFilePath);
          return;
        }

        // Extract the text from the file
        const fileText = data;

        // Remove the temporary file
        cleanupTempFile(tempFilePath);

        res.status(200).json({ message: 'File uploaded successfully', filename, fileText });
      });
    } else {
      // Remove the temporary file
      cleanupTempFile(tempFilePath);

      res.status(200).json({ message: 'File uploaded successfully', filename });
    }
  });

  req.on('error', (err: Error) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
    cleanupTempFile(tempFilePath);
  });
};

const cleanupTempFile = (filePath: string) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(err);
    }
  });
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
