### TTS Overview

The Text-to-Speech (TTS) functionality in this application allows users to convert chat messages and file transcripts into high-quality spoken audio. It is powered by **Azure AI Speech Services** and supports a wide range of languages and voices.

### Key Features

- **High-Quality Neural Voices**: Uses Azure's state-of-the-art neural voices for natural-sounding speech.
- **Multilingual Support**: Supports over 30 base languages with dozens of regional variants.
- **Integrated with Translations**: Can speak both original content and user-triggered translations.
- **Dynamic Voice Resolution**: Automatically selects the best voice based on the detected language of the text or user preferences.
- **Customizable Speech Parameters**: Users can adjust the speech rate (speed) and pitch to their preference.
- **Per-Language Defaults**: Users can set preferred voices for specific languages.
- **Quick Overrides (Chat)**: A context menu in the chat allows for temporary adjustments to voice and parameters for a single message.
- **Markdown Cleaning**: Automatically strips markdown formatting (bold, italics, code blocks) before synthesis for better speech quality.

### Core Libraries & Services

- **Azure AI Speech Services**: The backend provider for speech synthesis.
- **Microsoft Cognitive Services Speech SDK**: Used on the server-side to communicate with Azure.
- **Azure Identity**: Used for Entra ID (Managed Identity) authentication when a subscription key is not provided.
- **Language Detection**: An internal service used to detect the language of the text when not explicitly provided.

### Workflow Summary

1. The user triggers TTS via the speaker icon on a message.
2. The client sends the text and user settings to `/api/chat/tts`.
3. The server cleans the text and determines the appropriate voice.
4. The server requests audio from Azure Speech Services (using SSML if custom rate/pitch are needed).
5. The audio is streamed back to the client as an MP3 file.
6. The client plays the audio using a standard HTML5 Audio element.
