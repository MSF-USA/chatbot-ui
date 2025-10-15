# Setup Guide

This guide will help you set up the MSF AI Assistant development environment from scratch.

## Prerequisites

### Required Software

- **Node.js** 24.x or higher
- **npm** 10.x or higher (comes with Node.js)
- **Git** for version control
- A code editor (VS Code recommended)

### Required Access

- Azure OpenAI API access
- Azure AD application credentials
- Bing Search API key (optional, for web search)

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/your-org/chatbot-ui.git
cd chatbot-ui
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- NextAuth.js v5
- And other dependencies

### 3. Environment Configuration

#### Create Environment File

Copy the example environment file:

```bash
cp .env.example .env.local
```

#### Configure Required Variables

Edit `.env.local` and add your actual credentials. The `.env.example` file contains detailed descriptions of all available environment variables.

**Minimum required variables:**
- `NEXTAUTH_URL` - Your application URL (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `AZURE_AD_CLIENT_ID` - From Azure AD app registration
- `AZURE_AD_CLIENT_SECRET` - From Azure AD app registration
- `AZURE_AD_TENANT_ID` - From Azure AD
- `AZURE_OPENAI_API_KEY` - From Azure OpenAI resource
- `AZURE_OPENAI_ENDPOINT` - From Azure OpenAI resource
- `AZURE_OPENAI_DEPLOYMENT_NAME` - Your model deployment name

**Optional variables:**
- `AZURE_SPEECH_API_KEY` / `AZURE_SPEECH_REGION` - For text-to-speech
- `AZURE_BLOB_STORAGE_*` - For file uploads
- `WHISPER_*` - For audio transcription
- `AZURE_AI_FOUNDRY_ENDPOINT` - For AI agent support
- `LAUNCHDARKLY_CLIENT_ID` - For feature flags

See `.env.example` for complete documentation of all variables.

### 4. Azure Setup (Optional but Recommended)

Follow these steps to set up your Azure resources for the application.

#### Azure OpenAI Service

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Create or navigate to your Azure OpenAI resource
3. Go to "Keys and Endpoint"
4. Copy:
   - API Key → `AZURE_OPENAI_API_KEY`
   - Endpoint → `AZURE_OPENAI_ENDPOINT`
5. Go to "Model deployments"
6. Deploy required models:
   - GPT-4 or GPT-3.5-turbo
   - (Optional) Whisper for transcription
   - (Optional) DALL-E for image generation
7. Copy deployment name → `AZURE_OPENAI_DEPLOYMENT_NAME`

#### Azure AD Application

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Configure:
   - Name: "MSF AI Assistant"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
5. Click "Register"
6. Copy "Application (client) ID" → `AZURE_AD_CLIENT_ID`
7. Copy "Directory (tenant) ID" → `AZURE_AD_TENANT_ID`
8. Go to "Certificates & secrets"
9. Create new client secret
10. Copy secret value → `AZURE_AD_CLIENT_SECRET`

### 5. Start Development Server

```bash
npm run dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000)

## Verification

### Test Authentication

1. Navigate to http://localhost:3000
2. You should be redirected to `/signin`
3. Click "Sign in with Azure AD"
4. Complete Azure AD authentication
5. You should be redirected back to the chat interface

### Test Chat

1. After signing in, you should see the chat interface
2. Type a message and press Enter
3. You should see a streaming response from the AI

### Test Features

Try these features to ensure everything works:

- **Chat**: Send messages and receive responses
- **New Conversation**: Create a new conversation
- **Settings**: Open settings and change theme
- **Web Search** (if configured): Use the web search feature
- **File Upload**: Upload a text file
- **Audio Transcription** (if configured): Upload an audio file

## Troubleshooting

### Common Issues

**"Module not found" errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**"Authentication failed"**
- Verify all Azure AD credentials in `.env.local` match `.env.example` format
- Check redirect URI is configured in Azure AD app registration
- Ensure `NEXTAUTH_URL` matches your application URL exactly
- Verify `NEXTAUTH_SECRET` is set and is a valid base64 string

**"Failed to fetch AI response"**
- Verify Azure OpenAI credentials
- Check API endpoint is correct
- Ensure model deployment exists and is named correctly
- Check API version is compatible

**"Build failed" with TypeScript errors**
```bash
# Build will show TypeScript errors
npm run build

# Fix reported errors before deploying
```

**Port 3000 already in use**
```bash
# Use a different port
PORT=3001 npm run dev
```

### Debug Mode

Enable debug logging:

```env
# Add to .env.local
DEBUG=true
NODE_ENV=development
```

### Check Logs

Development server logs appear in your terminal. Look for:
- API route errors
- Authentication issues
- Environment variable warnings

## IDE Setup

### VS Code (Recommended)

Install recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

Configure settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
- Review [FEATURES.md](./FEATURES.md) for feature documentation
- Check existing issues and PRs on GitHub
- Join the development Slack channel (if applicable)

## Support

For setup help:
1. Check this documentation
2. Search existing GitHub issues
3. Contact the development team
4. Reach out on Slack (internal MSF)
