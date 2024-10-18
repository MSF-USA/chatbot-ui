import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { execFile } from 'child_process';

const unlinkAsync = promisify(fs.unlink);
const execFileAsync = promisify(execFile);

export function isBase64(str: string): boolean {
  console.time('isBase64');
  try {
    const result = Buffer.from(Buffer.from(str, 'base64').toString('utf8')).toString('base64') === str;
    console.timeEnd('isBase64');
    return result;
  } catch (err) {
    console.timeEnd('isBase64');
    return false;
  }
}

export async function saveBase64AsFile(base64String: string): Promise<string> {
  console.time('saveBase64AsFile');
  console.log('Saving base64 string as file...');
  const tempFilePath = path.join(os.tmpdir(), `temp_audio_${Date.now()}.wav`);
  const buffer = Buffer.from(base64String, 'base64');
  await fs.promises.writeFile(tempFilePath, buffer);
  console.log(`File saved at: ${tempFilePath}`);
  console.timeEnd('saveBase64AsFile');
  return tempFilePath;
}

export async function splitAudioFile(
  filePath: string,
  maxSize: number
): Promise<string[]> {
  console.time('splitAudioFile');
  console.log(`Splitting audio file: ${filePath}`);

  // Convert to WAV first
  const wavFilePath = path.join(os.tmpdir(), `${path.basename(filePath, path.extname(filePath))}_converted.wav`);
  await convertToWav(filePath, wavFilePath);
  console.log(`Converted file: ${wavFilePath}`);

  const fileSize = fs.statSync(wavFilePath).size;
  if (fileSize <= maxSize) {
    console.log('File size is within limit, no splitting required.');
    console.timeEnd('splitAudioFile');
    return [wavFilePath];
  }

  const duration = await getAudioDuration(wavFilePath);
  const numSegments = Math.ceil(fileSize / maxSize);
  const segmentDuration = duration / numSegments;
  console.log(`Splitting into ${numSegments} segments`);

  const segmentPaths: string[] = [];
  for (let i = 0; i < numSegments; i++) {
    console.log(`Generating segment ${i + 1} of ${numSegments}`);
    const startTime = i * segmentDuration;
    const segmentPath = path.join(
      os.tmpdir(),
      `${path.basename(wavFilePath, path.extname(wavFilePath))}_segment_${i}_${Date.now()}.wav`
    );
    await extractAudioSegment(wavFilePath, segmentPath, startTime, segmentDuration);

    // Check if the file was created
    if (fs.existsSync(segmentPath)) {
      console.log(`Segment file created: ${segmentPath}`);
      segmentPaths.push(segmentPath);
    } else {
      console.error(`Failed to create segment file: ${segmentPath}`);
    }
  }

  console.log('Audio file splitting completed.');
  console.timeEnd('splitAudioFile');
  return segmentPaths;
}

export function getAudioDuration(filePath: string): Promise<number> {
  console.time('getAudioDuration');
  console.log(`Getting audio duration for: ${filePath}`);
  return new Promise<number>((resolve, reject) => {
    const args = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath];
    execFile('ffprobe', args, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error(`Error getting audio duration: ${stderr}`);
        console.timeEnd('getAudioDuration');
        reject(new Error(`Error getting audio duration: ${stderr}`));
      } else {
        const duration = parseFloat(stdout);
        if (isNaN(duration)) {
          console.error('Could not parse duration from ffprobe output.');
          console.timeEnd('getAudioDuration');
          reject(new Error('Could not parse duration from ffprobe output.'));
        } else {
          console.log(`Audio duration: ${duration} seconds`);
          console.timeEnd('getAudioDuration');
          resolve(duration);
        }
      }
    });
  });
}

export function extractAudioSegment(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  console.time('extractAudioSegment');
  console.log(`Extracting audio segment: ${inputPath} -> ${outputPath}`);
  return new Promise<void>((resolve, reject) => {
    const args = [
      '-y',
      '-i',
      inputPath,
      '-ss',
      startTime.toString(),
      '-t',
      duration.toString(),
      '-c',
      'copy',
      outputPath,
    ];
    execFile('ffmpeg', args, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error(`Error extracting audio segment: ${stderr}`);
        console.timeEnd('extractAudioSegment');
        reject(new Error(`Error extracting audio segment: ${stderr}`));
      } else {
        console.log('Audio segment extracted successfully.');
        console.timeEnd('extractAudioSegment');
        resolve();
      }
    });
  });
}

export function cleanUpFiles(filePaths: string[]): Promise<void[]> {
  console.time('cleanUpFiles');
  console.log(`Cleaning up ${filePaths.length} files...`);
  const unlinkPromises = filePaths.map(async (filePath) => {
    await fs.promises
      .access(filePath)
      .then(() => unlinkAsync(filePath))
      .then(() => console.log(`Deleted file: ${filePath}`))
      .catch(() => console.log(`File not found: ${filePath}`));
  });
  console.timeEnd('cleanUpFiles');
  return Promise.all(unlinkPromises);
}

export async function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  console.time('convertToWav');
  console.log(`Converting to WAV: ${inputPath} -> ${outputPath}`);
  const args = [
    '-y',
    '-i',
    inputPath,
    '-ar',
    '16000',
    '-ac',
    '1',
    '-f',
    'wav',
    outputPath,
  ];
  await execFileAsync('ffmpeg', args);
}
