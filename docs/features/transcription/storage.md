### Transcription Storage and Data Handling

The transcription feature uses multiple storage mechanisms for audio data and processing state.

#### 1. Persistent Audio Storage

- **Location**: User audio files are stored in the configured blob storage (Azure Blob Storage or Local Storage).
- **Path Pattern**: `{userId}/uploads/files/{fileId}`
- **Lifecycle**: Files uploaded for transcription via the voice capture tool are typically deleted after successful synchronous transcription. Files uploaded as part of a chat message follow the standard file lifecycle of the application.

#### 2. Temporary Processing Storage

For operations like audio extraction and splitting, the system uses the server's temporary directory.

- **Location**: OS temporary directory (e.g., `/tmp` on Linux).
- **Usage**:
  - **Video Extraction**: The extracted audio track is saved as a temporary `.mp3` or `.wav` file.
  - **Chunking**: When splitting large files, each chunk is saved as a separate temporary file.
- **Cleanup**: The system includes `finally` blocks and cleanup utilities (`cleanupChunks`, `cleanupFile`) to ensure temporary files are deleted immediately after processing, even if an error occurs.

#### 3. Job State Storage

- **Chunked Transcription**: Job state is stored **in-memory** on the server via `chunkedJobStore.ts`.
  - **Pros**: Fast, no database overhead.
  - **Cons**: Jobs do not persist across server restarts. If the server restarts, any active transcription jobs will fail and must be restarted by the user.
- **Batch Transcription (Legacy)**: Job state is managed by **Azure Speech Services**.
  - The application only stores the `jobId` and polls Azure for the state.

#### 4. Security Considerations

- **Access Control**: All transcription endpoints require a valid session. Files are accessed using the user's specific path in blob storage.
- **SAS URLs**: For Azure Batch Transcription, temporary SAS (Shared Access Signature) URLs are generated to allow Azure Speech Services to access the file securely for a limited time (24 hours).
- **Sanitization**: Filenames and paths are sanitized before being passed to shell commands (like FFmpeg) to prevent injection attacks.
