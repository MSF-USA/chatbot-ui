/**
 * Server-side audio extraction utilities using FFmpeg.
 * Used to extract audio tracks from video files for transcription.
 */
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

// Set the FFmpeg path from the static binary
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface AudioExtractionResult {
  outputPath: string;
  duration?: number;
}

export interface AudioExtractionOptions {
  outputFormat?: 'mp3' | 'wav' | 'm4a';
  audioBitrate?: number;
}

/**
 * Extracts audio from a video file to the specified format.
 *
 * @param inputPath - Path to the input video file
 * @param options - Extraction options (format, bitrate)
 * @returns Promise resolving to the output file path
 */
export async function extractAudioFromVideo(
  inputPath: string,
  options: AudioExtractionOptions = {},
): Promise<AudioExtractionResult> {
  const { outputFormat = 'mp3', audioBitrate = 128 } = options;

  // Generate output path by replacing extension
  const outputPath = inputPath.replace(/\.[^.]+$/, `_audio.${outputFormat}`);

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .noVideo()
      .audioBitrate(audioBitrate)
      .output(outputPath);

    // Set audio codec based on format
    switch (outputFormat) {
      case 'mp3':
        command.audioCodec('libmp3lame');
        break;
      case 'wav':
        command.audioCodec('pcm_s16le');
        break;
      case 'm4a':
        command.audioCodec('aac');
        break;
    }

    command
      .on('end', () => {
        console.log(
          `[AudioExtractor] Successfully extracted audio to: ${outputPath}`,
        );
        resolve({ outputPath });
      })
      .on('error', (err: Error) => {
        console.error(`[AudioExtractor] Extraction failed:`, err.message);
        reject(new Error(`Audio extraction failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Checks if FFmpeg is available and properly configured.
 *
 * @returns Promise resolving to true if FFmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ffmpegPath) {
      resolve(false);
      return;
    }

    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}
