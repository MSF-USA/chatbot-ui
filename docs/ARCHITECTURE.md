# Architecture

## Overview

MSF AI Assistant is a Next.js 15 application built with the App Router, providing an AI chatbot interface powered by Azure OpenAI. The application uses modern React patterns with TypeScript and Zustand for state management.

## Technology Stack

### Core Framework

- **Next.js 15** - App Router architecture
- **React 19** - UI library with Server and Client Components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

### State Management

- **Zustand** - Lightweight state management
  - `useUIStore` - UI state (theme, modals, sidebar)
  - `useSettingsStore` - User settings (temperature, system prompt, prompts)
  - `useConversationStore` - Conversation management and folders
  - `useChatStore` - Active chat state and message handling

### Authentication

- **NextAuth.js** - Authentication with Azure AD integration

### Internationalization

- **next-intl** - App Router compatible i18n library
- Translation files in `messages/{locale}.json`
- Supports 33 languages

### AI Integration

- **Azure OpenAI** - GPT models via Microsoft Azure
- Streaming responses with custom smooth streaming implementation
- Support for function calling and structured outputs

## Directory Structure

```
/app                    # Next.js App Router pages
  /[locale]            # Internationalized pages
  /api                 # API routes
    /agents            # AI agent endpoints
    /auth              # Authentication (NextAuth)
    /chat              # Chat completion endpoints
    /file              # File upload/processing
    /health            # Health check endpoint
    /terms             # Terms and privacy endpoints
    /transcription     # Audio transcription
    /tts               # Text-to-speech

/components            # React components
  /Chat                # Chat interface components
  /sidebar             # Sidebar with conversations/prompts
  /settings            # Settings dialog and sections
  /providers           # Context providers

/lib                   # Shared libraries
  /data                # Static data files
  /hooks               # Custom React hooks
  /services            # Business logic services
  /stores              # Zustand stores
  /utils               # Utility functions

/messages              # Internationalization files
  en.json              # English translations
  fr.json              # French translations
  ...                  # 30+ other languages

/types                 # TypeScript type definitions

/config                # Configuration files
  models.ts            # Environment-specific model config

/public                # Static assets
```

## Key Features

### Chat Interface

- Real-time streaming responses with smooth streaming mode
- Conversation management (create, edit, delete, search)
- Folder organization for conversations
- Message regeneration and editing
- Code syntax highlighting
- Markdown rendering

### Advanced Features

- **Web Search** - Bing API integration for web searches
- **URL Puller** - Extract and analyze content from URLs
- **File Upload** - Support for various file types
- **Audio Transcription** - Whisper API integration
- **Text-to-Speech** - Convert responses to audio
- **Image Upload** - Vision model support
- **Language Translation** - Multi-language translation

### Settings Management

- **General Settings** - Language and theme preferences
- **Chat Settings** - Temperature, system prompt, streaming options
- **Privacy Control** - Privacy policy and terms
- **Data Management** - Import/export conversations
- **Account Settings** - User information management

### Storage

- Browser localStorage for client-side data persistence
- Conversation history
- User preferences
- System prompts and custom prompts

## Data Flow

### Client-Side

1. User interacts with Chat component
2. Message sent to API route via fetch
3. Streaming response handled by custom stream reader
4. UI updates in real-time with smooth streaming
5. Conversation saved to localStorage via Zustand store

### Server-Side

1. API route receives request
2. Validates authentication via NextAuth
3. Calls Azure OpenAI API
4. Streams response back to client
5. Handles errors and retries

## State Management Pattern

### Zustand Stores

Each store is a focused slice of state with actions:

```typescript
// Example: useConversations store
const useConversations = create<ConversationsState>((set) => ({
  conversations: [],
  selectedConversation: null,
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [...state.conversations, conversation],
    })),
  // ... other actions
}));
```

### Component Usage

```typescript
function Chat() {
  const { selectedConversation, updateConversation } = useConversationStore();
  const { temperature } = useSettingsStore();

  // Component logic
}
```

## Authentication Flow

1. User redirected to `/signin` if not authenticated
2. Azure AD SAML authentication via NextAuth
3. Session stored and validated
4. User information available via `useSession()` hook
5. Protected API routes validate session

## Internationalization

### Translation Structure

- All translations in `messages/{locale}.json`
- Component usage: `const t = useTranslations()`
- Support for parameterized translations
- Dynamic locale switching

### Adding a New Translation

1. Add key-value pair to `messages/en.json`
2. Copy to other locale files
3. Translate the value for each locale
4. Use in component: `{t('Your Key')}`

## Performance Optimizations

- **Code Splitting** - Automatic with Next.js App Router
- **Server Components** - Reduced client JavaScript
- **Streaming** - Progressive content delivery
- **Local Storage** - Offline-first data persistence
- **Memoization** - React.memo and useMemo for expensive computations

## Security

- **Authentication** - Enterprise SSO via Azure AD
- **API Protection** - Server-side session validation
- **Data Privacy** - Client-side storage, no server persistence
- **HTTPS Only** - Enforced in production
- **CSP Headers** - Content Security Policy configured

## Deployment

### Environment Variables

See `.env.example` for required variables:

- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - Session encryption key
- `AZURE_AD_*` - Azure AD configuration
- `AZURE_OPENAI_*` - Azure OpenAI credentials

### Build Process

```bash
npm run build    # Production build
npm run start    # Start production server
```

### Docker Support

```bash
docker build -t msf-ai-assistant .
docker run -p 3000:3000 msf-ai-assistant
```

## Development Workflow

1. Feature development in feature branches
2. Local testing with `npm run dev`
3. Run tests with `npm test`
4. Build verification with `npm run build`
5. PR review and merge to main
6. Automated deployment via GitHub workflows

## Testing Strategy

- Component testing with React Testing Library
- API route testing with Next.js test utilities
- E2E testing with Playwright
- Type safety with TypeScript strict mode

## Future Enhancements

- Real-time collaboration
- Advanced prompt library with sharing
- Custom model fine-tuning support
- Enhanced analytics and usage tracking
- Mobile app with React Native
