### Transcription Workflow

The transcription process follows different workflows depending on whether it's a direct voice capture or a file upload.

#### 1. Voice Capture Workflow

This workflow is used when a user clicks the microphone icon in the chat input.

1.  **Recording**: The user starts recording. `ChatInputVoiceCapture` uses the `MediaRecorder` API to capture audio chunks.
2.  **Silence Detection**: The component monitors volume levels. If silence is detected for 2 seconds:
    - The current audio segment is packaged as a blob.
    - The segment is uploaded via `/api/file/upload`.
    - A transcription request is sent to `/api/file/[id]/transcribe`.
3.  **Synchronous Transcription**: Since these segments are small, they are processed immediately using `WhisperTranscriptionService`.
4.  **UI Update**: The resulting text is appended to the chat input field.
5.  **Completion**: If silence persists for 6 seconds, recording stops automatically.

#### 2. File Upload Workflow (Pipeline)

This workflow is used when a user uploads an audio or video file as part of a message.

1.  **File Identification**: The `FileProcessor` stage in the chat pipeline detects audio/video files.
2.  **Audio Extraction (if video)**: If the file is a video, `FileProcessor` uses FFmpeg (`extractAudioFromVideo`) to pull the audio track into a temporary file.
3.  **Routing**:
    - **Files ≤ 25MB**: Processed synchronously via `WhisperTranscriptionService`. The transcript is added to the message context immediately.
    - **Files > 25MB**: A background job is started via `ChunkedTranscriptionService`.
4.  **Background Processing (Chunked)**:
    - The audio is split into ~20MB chunks using FFmpeg.
    - Chunks are processed in parallel (up to 3 at a time) using Whisper.
    - Results are combined in order once all chunks are complete.
5.  **Polling**: The frontend receives a `jobId` and uses the `useTranscriptionPolling` hook to poll `/api/transcription/status/[jobId]`.
6.  **Finalization**: Once the status is `Succeeded`, the frontend replaces the placeholder message with the final transcript.

#### 3. Error Handling

- **FFmpeg Missing**: If FFmpeg is not available on the server, video extraction and chunking will fail with a descriptive error.
- **Rate Limits**: The `WhisperTranscriptionService` handles 429 errors from Azure/OpenAI with retry logic (especially important for chunked jobs).
- **Size Limits**: Individual segments/files sent to Whisper must be under 25MB.
