### TTS API Reference

The Text-to-Speech functionality is exposed through a single internal API route.

### `POST /api/chat/tts`

Converts text to speech audio using Azure AI Speech Services.

#### Authentication

Requires an active user session.

#### Request Body (`TTSRequest`)

| Field              | Type     | Description                                                   |
| :----------------- | :------- | :------------------------------------------------------------ |
| `text`             | `string` | **Required.** The text to convert to speech.                  |
| `voiceName`        | `string` | Optional. Explicit voice override (e.g., "en-US-AriaNeural"). |
| `detectedLanguage` | `string` | Optional. ISO language code to avoid server-side detection.   |
| `rate`             | `number` | Optional. Speech rate multiplier (0.5 to 2.0).                |
| `pitch`            | `number` | Optional. Pitch adjustment percentage (-50 to +50).           |
| `outputFormat`     | `string` | Optional. One of the supported `TTSOutputFormat` values.      |
| `globalVoice`      | `string` | Optional. User's preferred global fallback voice.             |
| `languageVoices`   | `object` | Optional. Map of base language codes to preferred voices.     |

#### Response

- **Success (200 OK)**: Returns an MP3 audio stream.
  - `Content-Type`: `audio/mpeg`
  - `Content-Disposition`: `attachment; filename="speech.mp3"`
- **Error (400 Bad Request)**: Missing or invalid parameters.
- **Error (401 Unauthorized)**: No active session.
- **Error (500 Internal Server Error)**: Azure service failure or configuration error.

#### Server-side Logic Details

1. **Sanitization**: Uses `cleanMarkdown` to strip formatting.
2. **Resolution**:
   - If `voiceName` is provided, it is used directly.
   - If `globalVoice` is a Multilingual voice, it is used.
   - Otherwise, language is detected and resolved against `languageVoices` or system defaults.
3. **Synthesis**:
   - If `rate` or `pitch` are adjusted, synthesis uses **SSML**.
   - Otherwise, it uses plain text synthesis for lower latency.
