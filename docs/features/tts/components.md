### TTS UI Components

This document describes the React components responsible for the TTS user experience.

### 1. `AssistantMessage`

The main entry point for TTS.

- Displays a speaker icon.
- Handles the state for audio generation (`isGeneratingAudio`) and playback (`audioUrl`).
- On click, triggers the `handleTTS` function which calls the API.
- On right-click, opens the `TTSContextMenu`.

### 2. `TTSContextMenu`

A quick-access menu for message-specific overrides.

- Appears near the speaker icon on right-click.
- Allows the user to:
  - Select a different voice for the current message.
  - Adjust the speech rate and pitch.
- These settings are only applied to the current synthesis request and are not saved to global settings.

### 3. `TTSSettingsPanel`

Located in the application settings under "Chat Settings > Text-to-Speech".

- Manages the user's global TTS preferences.
- Includes:
  - **Voice Browser**: To explore and select voices.
  - **Rate & Pitch Sliders**: To set global defaults.
  - **Audio Quality Dropdown**: To select the preferred bitrate.
- Provides a **Reset** button to restore `DEFAULT_TTS_SETTINGS`.

### 4. `VoiceBrowser`

A specialized component for navigating the large catalog of Azure voices.

- Filters voices by language.
- Highlights "Multilingual" voices.
- Provides a **Preview** feature for each voice:
  - Uses language-specific sample text (`TTS_PREVIEW_SAMPLES`).
  - Plays a short audio clip using the selected voice without changing global settings.
- Displays voice metadata like gender and type (Neural/Multilingual).

### 5. `TranscriptViewer`

Used to display and interact with audio/video file transcripts.

- Features a speaker icon to convert the transcript text to speech.
- Supports speaking both the original transcript and any active translations.
- **Limitation**: TTS is disabled for large transcripts stored as blob references to prevent excessive API costs and potential timeout issues. It is only available for transcripts that are stored directly within the message content.
- Handles its own audio generation state and playback via a local `AudioPlayer` component.
- Uses the same `/api/chat/tts` endpoint as chat messages.

### 6. `AudioPlayer`

A reusable UI component for controlling audio playback.

- Used by both `AssistantMessage` and `TranscriptViewer`.
- Provides standard playback controls (play/pause, progress bar, volume).
- Displays an "X" button to close the player and stop playback.
- Receives the `audioUrl` (Blob URL) as a prop.
