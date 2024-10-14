import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import {exec} from "child_process";

const unlinkAsync = promisify(fs.unlink);
ffmpeg.setFfmpegPath(ffmpegStatic as string);

export function isBase64(str: string): boolean {
  try {
    return Buffer.from(Buffer.from(str, 'base64').toString('utf8')).toString('base64') === str;
  } catch (err) {
    return false;
  }
}

export async function saveBase64AsFile(base64String: string): Promise<string> {
  const tempFilePath = path.join(os.tmpdir(), `temp_audio_${Date.now()}.wav`);
  const buffer = Buffer.from(base64String, 'base64');
  await fs.promises.writeFile(tempFilePath, buffer);
  return tempFilePath;
}

export async function splitAudioFile(filePath: string, maxSize: number): Promise<string[]> {
  const fileSize = fs.statSync(filePath).size;
  if (fileSize <= maxSize) {
    return [filePath];
  }

  const duration = await getAudioDuration(filePath);
  const numSegments = Math.ceil(fileSize / maxSize);
  const segmentDuration = duration / numSegments;

  const segmentPaths: string[] = [];
  for (let i = 0; i < numSegments; i++) {
    const startTime = i * segmentDuration;
    const segmentPath = path.join(
      os.tmpdir(),
      `${path.basename(filePath, path.extname(filePath))}_segment_${i}_${Date.now()}.wav`
    );
    await extractAudioSegment(filePath, segmentPath, startTime, segmentDuration);
    segmentPaths.push(segmentPath);
  }

  return segmentPaths;
}

export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Error getting audio duration: ${err.message}`));
      } else {
        const duration = metadata.format.duration;
        resolve(duration || 0);
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
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration)
      .output(outputPath)
      .noVideo()
      .audioCodec('pcm_s16le') // WAV format
      .format('wav')
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(new Error(`Error extracting audio segment: ${err.message}`));
      })
      .run();
  });
}

export function cleanUpFiles(filePaths: string[]): Promise<void[]> {
  const unlinkPromises = filePaths.map(async (filePath) => {
    await fs.promises.access(filePath)
      .then(() => unlinkAsync(filePath))
      .catch(() => { /* File does not exist, no action needed */ });
  });
  return Promise.all(unlinkPromises);
}

export function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error converting audio file: ${stderr}`);
      } else {
        resolve();
      }
    });
  });
}
