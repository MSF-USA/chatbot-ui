# Setup Guide

This guide will help you set up the MSF AI Assistant development environment from scratch.

## Prerequisites

### Required Software

- **Node.js** 18.x or higher
- **npm** 9.x or higher (comes with Node.js)
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
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- NextAuth.js
- And other dependencies

### 3. Environment Configuration

#### Create Environment File

Copy the example environment file:

```bash
cp .env.example .env.local
```

#### Configure Required Variables

Edit `.env.local` and add your credentials:

**NextAuth Configuration:**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
```

**Azure AD Authentication:**
```env
AZURE_AD_CLIENT_ID=your-azure-ad-client-id
AZURE_AD_CLIENT_SECRET=your-azure-ad-client-secret
AZURE_AD_TENANT_ID=your-azure-ad-tenant-id
```

**Azure OpenAI:**
```env
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**Optional - Web Search:**
```env
BING_API_KEY=your-bing-search-api-key
```

**Optional - Transcription:**
```env
AZURE_WHISPER_DEPLOYMENT_NAME=whisper
```

### 4. Azure Setup

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

#### Bing Search API (Optional)

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Create "Bing Search v7" resource
3. Go to "Keys and Endpoint"
4. Copy API key → `BING_API_KEY`

### 5. Database Setup (Optional)

The application uses localStorage by default. For production deployments with server-side conversation storage:

1. Set up a PostgreSQL database
2. Add database URL to `.env.local`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/msf_ai_assistant
   ```
3. Run migrations:
   ```bash
   npm run db:migrate
   ```

### 6. Start Development Server

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
- Verify Azure AD credentials in `.env.local`
- Check redirect URI is configured in Azure AD app
- Ensure `NEXTAUTH_URL` matches your application URL

**"Failed to fetch AI response"**
- Verify Azure OpenAI credentials
- Check API endpoint is correct
- Ensure model deployment exists and is named correctly
- Check API version is compatible

**"Build failed" with TypeScript errors**
```bash
# Run type checking to see all errors
npm run type-check

# Fix reported errors before building
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

## Production Deployment

For production deployment instructions, see:
- [Vercel Deployment Guide](./DEPLOYMENT_VERCEL.md)
- [Docker Deployment Guide](./DEPLOYMENT_DOCKER.md)
- [Azure App Service Guide](./DEPLOYMENT_AZURE.md)

## Support

For setup help:
1. Check this documentation
2. Search existing GitHub issues
3. Contact the development team
4. Reach out on Slack (internal MSF)
