### Transcription Testing

The transcription feature is covered by both backend and frontend tests to ensure reliability across different file sizes and processing paths.

#### 1. API Testing

The main transcription endpoint is tested in:
`__tests__/app/api/file-id-transcribe.test.ts`

These tests cover:

- **Authentication**: Ensuring only authenticated users can access transcription.
- **File Routing**: Verifying files are downloaded from the correct user-specific blob storage paths.
- **Service Selection**: Confirming the correct transcription service (Whisper or Batch) is chosen based on file size.
- **Cleanup**: Ensuring temporary files and blobs are cleaned up after transcription.
- **Error Handling**: Testing behavior when storage download fails or transcription services return errors.

#### 2. Service Testing

Each transcription service has its own set of tests (check for files in `__tests__/lib/services/transcription/` if available).

Key areas of service testing include:

- **Whisper Service**: Mocking the Azure OpenAI client and verifying correct parameters are passed.
- **Chunked Service**: Testing the logic for splitting files and combining results, including handling parallel processing batches.
- **Batch Service**: Mocking Azure Speech Batch API responses and status polling.

#### 3. Unit Utilities

Utilities for audio processing are also tested:

- **Audio Extractor**: Testing FFmpeg command generation for pulling audio from different video containers.
- **Audio Splitter**: Verifying that files are correctly split into segments of the target size.

#### 4. Manual Testing Recommendations

When testing transcription manually, consider the following scenarios:

- **Direct Voice Capture**: Use the microphone icon for short and long recordings.
- **Small Audio File**: Upload an MP3/WAV under 25MB.
- **Large Audio File**: Upload an audio file over 25MB to trigger the chunked workflow.
- **Video File**: Upload an MP4/MKV to verify audio extraction.
- **Language Specification**: Test with different languages and technical prompts.
- **Interruption**: Restart the server during a chunked job to verify failure handling.
