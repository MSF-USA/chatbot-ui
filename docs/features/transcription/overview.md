### Transcription Feature Overview

The transcription feature allows users to convert audio and video files into text transcripts. It supports a wide range of formats and handles both small recordings and large files through different processing paths.

#### Core Capabilities

- **Audio Transcription**: Supports MP3, WAV, M4A, WEBM, and other common audio formats.
- **Video Transcription**: Automatically extracts audio from video files (MP4, MKV, etc.) before transcription.
- **Real-time Voice Input**: Allows users to record voice directly in the chat interface with automatic silence detection.
- **Large File Support**: Processes files larger than 25MB by splitting them into chunks.
- **Multi-language Support**: Supports various languages with auto-detection or user-specified settings.

#### High-Level Architecture

The transcription system is built on a factory pattern that routes requests based on file size and processing requirements:

1.  **Small Files (≤ 25MB)**: Processed synchronously using the **Whisper API**.
2.  **Large Files (> 25MB)**: Processed asynchronously using **Chunked Transcription** (splitting the file and processing chunks in parallel) or **Azure Batch Transcription** (legacy).

#### Key Components

- **Frontend**: `ChatInputVoiceCapture` for recording and `useTranscriptionPolling` for tracking async jobs.
- **API**: `/api/file/[id]/transcribe` for starting transcription and `/api/transcription/status/[jobId]` for status polling.
- **Services**: `WhisperTranscriptionService`, `ChunkedTranscriptionService`, and `BatchTranscriptionService`.
- **Infrastructure**: **FFmpeg** for audio extraction and splitting, and **Azure OpenAI/Whisper** for the actual transcription.
