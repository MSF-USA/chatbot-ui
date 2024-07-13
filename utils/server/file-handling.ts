import { exec } from 'child_process';
import { promisify } from 'util';
import {lookup} from "mime-types";
import fs from "fs";

const execAsync = promisify(exec);

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
    try {
      await execAsync(`rm "${inputPath}" "${outputPath}"`);
    } catch (removeFileError: any) {
      console.warn(`Error removing converted file with Pandoc: ${removeFileError}`);
      if (removeFileError.message.indexOf('File not found') === -1
        && removeFileError.message.indexOf('No such file or directory') === -1
      ) {
        throw removeFileError
      }
    }
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

  console.log("mimeType", mimeType)

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
