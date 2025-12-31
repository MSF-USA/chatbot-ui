### TTS Testing

This document outlines the testing strategy and existing tests for the Text-to-Speech functionality.

### Core Tests

Automated tests for the TTS API are located in:

- `__tests__/app/api/chat-tts.test.ts`

These tests focus on:

- **Authentication**: Ensuring the user has an active session before processing synthesis requests.
- **Request Validation**: Verifying that text is provided and is not empty after sanitization.
- **Text Cleaning**: Mocking the `cleanMarkdown` utility to ensure it's called correctly before sending text to the speech service.
- **Error Handling**: Verifying that appropriate HTTP status codes and error messages are returned when failures occur.

### Manual Testing Procedures

When maintaining or updating the TTS feature, the following manual checks are recommended:

#### 1. Integration Check (Chat)

- Open a chat session.
- Send a message and wait for the response.
- Click the speaker icon and verify audio plays correctly.
- Test with messages containing markdown (bold, code blocks) to ensure sanitization works.

#### 2. Integration Check (Transcripts)

- Upload an audio or video file.
- Wait for the transcription to complete.
- Open the transcript viewer.
- Click the speaker icon and verify the transcript is read aloud.
- Use the translation feature and verify the speaker can read the translated text.

#### 3. Settings & Persistence

- Go to **Chat Settings > Text-to-Speech**.
- Change the global voice and audio quality.
- Refresh the page and verify settings are persisted.
- Use the **Preview** button for multiple voices across different languages.

#### 3. Voice Resolution

- Trigger TTS on a message in a non-English language (e.g., French or Spanish).
- Verify the system correctly detects the language and uses an appropriate voice (or the user's per-language override if set).

#### 4. Parameter Overrides

- Right-click the speaker icon on a message.
- Change the rate to `2.0x` and pitch to `+20%`.
- Click **Speak with Settings** and verify the changes are reflected in the generated audio.

### Limitations in Automated Testing

Full integration testing with Azure AI Speech Services is complex in a CI environment as it requires:

- Active Azure credentials.
- Network access to Azure endpoints.
- Verification of binary audio output.

Therefore, the automated tests primarily focus on the **application logic** (validation, sanitization, resolution) while mocking the external SDK calls.
