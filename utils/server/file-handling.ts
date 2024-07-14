import { exec } from 'child_process';
import { promisify } from 'util';
import {lookup} from "mime-types";
import fs from "fs";

const execAsync = promisify(exec);

async function retryRemoveFile(filePath: string, maxRetries = 3): Promise<void> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await fs.promises.unlink(filePath);
      console.log(`Successfully removed file: ${filePath}`);
      return;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`File not found, considered as removed: ${filePath}`);
        return;
      }
      if (attempt === maxRetries - 1) {
        console.warn(`Failed to remove file after ${maxRetries} attempts: ${filePath}`);
        return;
      }
      console.warn(`Attempt ${attempt + 1} to remove file failed. Retrying...`);
      await delay(Math.pow(2, attempt) * 1000); // Exponential backoff: 1s, 2s, 4s
    }
  }
}

/**
 * Converts a file using Pandoc.
 *
 * @param {string} inputPath - The path of the input file.
 * @param {string} outputFormat - The desired output format.
 * @returns {Promise<string>} - A promise that resolves to the converted file content.
 * @throws {Error} - If there was an error converting the file.
 */
export async function convertWithPandoc(inputPath: string, outputFormat: string): Promise<string> {
  const outputPath = `${inputPath}.${outputFormat}`;
  const command = `pandoc "${inputPath}" -o "${outputPath}"`;

  try {
    await execAsync(command);
    const { stdout } = await execAsync(`cat "${outputPath}"`);
    return stdout;
  } catch (error) {
    console.error(`Error converting file with Pandoc: ${error}`);
    throw error;
  } finally {
    // Clean up temporary files
    retryRemoveFile(inputPath).catch(error => {
      console.error(`Failed to remove temporary file ${inputPath}:`, error);
    });
    retryRemoveFile(outputPath).catch(error => {
      console.error(`Failed to remove temporary file ${outputPath}:`, error);
    });

  }
}

async function pdfToText(inputPath: string): Promise<string> {
  const { stdout } = await execAsync(`pdftotext "${inputPath}" -`);
  return stdout;
}


export async function loadDocument(file: File): Promise<string> {
  let text, content, loader;
  const mimeType = lookup(file.name) || 'application/octet-stream';
  const tempFilePath = `/tmp/${file.name}`;

  // Write the file to a temporary location
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.promises.writeFile(tempFilePath, buffer);

  switch (true) {
    case mimeType.startsWith('application/pdf'):
      text = await pdfToText(tempFilePath);
      break;
    case mimeType.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document'):
      text = await convertWithPandoc(tempFilePath, 'markdown');
      break;
    case mimeType.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
      throw new Error("Not supported file type");
    case mimeType.startsWith('application/vnd.openxmlformats-officedocument.presentationml.presentation'):
      throw new Error("Not supported file type");
    case mimeType.startsWith('application/epub+zip'):
      text = await convertWithPandoc(tempFilePath, 'markdown');
      break;
    case mimeType.startsWith('text/') || mimeType.startsWith('application/csv') || file.name.endsWith('.py') || file.name.endsWith('.sql')
    || mimeType.startsWith('application/json') || mimeType.startsWith('application/xhtml+xml'):
    default:
      try {
        text = await file.text()
        if (!text) {
          // If file.text() fails or returns empty, read from the temp file
          text = await fs.promises.readFile(tempFilePath, 'utf8');
        }
      } catch (error) {
        console.error(`Could not parse text from ${file.name}`);
        throw error;
      }
  }
  return text;
}
