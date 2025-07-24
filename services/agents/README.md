# Agent Development Guide

This guide explains how to add new agents to the chatbot system and create corresponding slash commands.

## Overview

The agent system consists of several key components:
- **Agent Classes**: Implement the business logic for each agent type
- **Agent Factory**: Registers and creates agent instances
- **Command Parser**: Handles slash commands that trigger specific agents
- **Type Definitions**: TypeScript interfaces for type safety
- **API Integration**: REST endpoints for agent execution

## Adding a New Agent

### Step 1: Define Agent Types

Add your new agent type to the `AgentType` enum in `/types/agent.ts`:

```typescript
export enum AgentType {
  // ... existing types
  YOUR_AGENT = 'your_agent',
}
```

### Step 2: Create Agent Configuration Interface

Define a configuration interface for your agent in `/types/agent.ts`:

```typescript
export interface YourAgentConfig extends AgentConfig {
  // Agent-specific configuration options
  customSetting?: string;
  enableFeature?: boolean;
  maxResults?: number;
  timeout?: number;
}
```

### Step 3: Create Service Class (Optional)

If your agent needs complex business logic, create a service class in `/services/`:

```typescript
// /services/yourAgentService.ts
export class YourAgentService {
  public async processRequest(params: YourParams): Promise<YourResponse> {
    // Implementation here
  }
}
```

### Step 4: Implement Agent Class

Create your agent class in `/services/agents/`:

```typescript
// /services/agents/yourAgent.ts
import { BaseAgent } from './baseAgent';
import { YourAgentConfig } from '@/types/agent';
import { YourAgentService } from '@/services/yourAgentService';

export class YourAgent extends BaseAgent<YourAgentConfig> {
  private service: YourAgentService;

  constructor(config: YourAgentConfig) {
    super(config);
    this.service = new YourAgentService();
  }

  async execute(context: AgentExecutionContext): Promise<AgentResponse> {
    try {
      // Parse parameters from the query
      const params = this.parseParameters(context.query);
      
      // Process the request
      const result = await this.service.processRequest(params);
      
      // Format response
      return {
        content: result.content,
        agentType: this.config.type,
        agentId: this.config.id,
        structuredContent: result.structuredContent,
        metadata: {
          confidence: result.confidence || 0.8,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      throw new Error(`Agent execution failed: ${error.message}`);
    }
  }

  private parseParameters(query: string): YourParams {
    // Parse query-specific parameters
    return {
      // extracted parameters
    };
  }
}
```

### Step 5: Register Agent in Factory

Add your agent to the `AgentFactory` in `/services/agentFactory.ts`:

```typescript
// In initializeDefaultAgents() method
this.registerAgent(
  AgentType.YOUR_AGENT,
  async (config: AgentConfig) => new YourAgent(config as YourAgentConfig),
  [
    'capability-1',
    'capability-2',
    // List of capabilities
  ],
  [
    'gpt-4',
    'gpt-4o',
    'gpt-4o-mini',
    // Supported models
  ]
);
```

### Step 6: Add Command to Parser

Register a slash command in `/services/commandParser.ts`:

```typescript
// In initializeCommands() method
this.registerCommand({
  command: 'youragent',
  type: CommandType.AGENT,
  description: 'Description of what your agent does',
  usage: '/youragent <parameters>',
  examples: [
    '/youragent example usage',
    '/youragent another example',
  ],
  execute: (args: string[]) => ({
    success: true,
    agentType: AgentType.YOUR_AGENT,
    message: 'Switched to your agent',
  }),
});
```

### Step 7: Update Configuration Files

Add your agent to various configuration files:

#### Default Settings (`/utils/app/settings.ts`)
```typescript
// Add to UI themes customColors
[AgentType.YOUR_AGENT]: '#your-color',
```

#### API Configuration (`/types/agentApi.ts`)
```typescript
// Add to SUPPORTED_AGENT_TYPES
export const SUPPORTED_AGENT_TYPES: AgentType[] = [
  // ... existing types
  AgentType.YOUR_AGENT,
];

// Add to DEFAULT_AGENT_CONFIGS
export const DEFAULT_AGENT_CONFIGS: Record<string, Record<string, any>> = {
  // ... existing configs
  [AgentType.YOUR_AGENT]: {
    customSetting: 'default-value',
    enableFeature: true,
    maxResults: 10,
    timeout: 30000,
  },
};
```

#### API Route Handler (`/app/api/v2/agent/execute/route.ts`)
```typescript
// Add import for your config type
import { YourAgentConfig } from '@/types/agent';

// Add to createAgentConfig return type union
function createAgentConfig(): 
  | AgentConfig
  | YourAgentConfig  // Add this line
  | ... // other types

// Add case in createAgentConfig switch statement
case AgentType.YOUR_AGENT:
  return {
    ...config,
    customSetting: userConfig.customSetting || defaultConfig.customSetting,
    enableFeature: userConfig.enableFeature ?? defaultConfig.enableFeature,
    // ... other config properties
  };

// Add case in getAgentEnvironment if needed
case AgentType.YOUR_AGENT:
  return AgentExecutionEnvironment.FOUNDRY; // or appropriate environment
```

### Step 8: Add Parameter Extraction (Optional)

If your agent needs complex parameter extraction, add it to `/services/parameterExtraction.ts`:

```typescript
// Add to DEFAULT_PARAMETER_CONFIG
[AgentType.YOUR_AGENT]: {
  keywords: ['keyword1', 'keyword2'],
  patterns: [/regex-pattern/g],
  // ... other extraction rules
},

// Add case in extractRuleBasedParameters
case AgentType.YOUR_AGENT:
  return this.extractYourAgentParams(query, context);

// Add case in getDefaultParameters
[AgentType.YOUR_AGENT]: {
  param1: 'default-value',
  param2: true,
},
```

### Step 9: Update Error Handling

Add your agent to error handling configurations:

#### Agent Error Handling (`/services/agentErrorHandling.ts`)
```typescript
export const AGENT_ERROR_STRATEGIES: Record<AgentType, ErrorStrategy> = {
  // ... existing strategies
  [AgentType.YOUR_AGENT]: {
    maxRetries: 2,
    retryDelay: 1000,
    fallbackAgent: AgentType.STANDARD_CHAT,
    errorCategories: {
      timeout: 'retry',
      validation: 'fail',
      network: 'retry',
    },
  },
};
```

#### Alternative Agents (`/services/agentErrorHandlingService.ts`)
```typescript
private getAlternativeAgent(failedAgent: AgentType): AgentType | null {
  const alternatives: Record<AgentType, AgentType[]> = {
    // ... existing alternatives
    [AgentType.YOUR_AGENT]: [AgentType.STANDARD_CHAT],
  };
  // ...
}
```

### Step 10: Add UI Components (Optional)

If your agent needs special UI components, add them to the appropriate locations:

#### Agent Features Section (`/components/Settings/AgentFeaturesSection.tsx`)
```typescript
// Add case in renderAgentSpecificSettings
case AgentType.YOUR_AGENT:
  return (
    <div>
      {/* Your agent-specific settings UI */}
    </div>
  );
```

## Testing Your Agent

### 1. Build Verification
```bash
npm run build
```

### 2. Type Checking
```bash
npm run lint
```

### 3. Manual Testing
- Start the development server: `npm run dev`
- Use the `/youragent` command in chat
- Verify the agent responds correctly
- Test error scenarios

### 4. API Testing
Test the agent via API endpoint:
```bash
curl -X POST /api/v2/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "your_agent",
    "query": "test query",
    "config": {}
  }'
```

## Best Practices

### Error Handling
- Always wrap agent execution in try-catch blocks
- Provide meaningful error messages
- Implement proper fallback mechanisms

### Performance
- Use caching for expensive operations
- Implement timeout handling
- Consider memory usage for large responses

### Type Safety
- Define comprehensive TypeScript interfaces
- Use strict typing throughout
- Validate input parameters

### Logging
- Use the built-in logging service
- Log important events and errors
- Include context information in logs

### Configuration
- Provide sensible defaults
- Make settings configurable
- Document configuration options

## Example: Translation Agent

The translation agent implementation serves as a complete example:

- **Service**: `/services/translationService.ts` - Azure OpenAI integration
- **Agent**: `/services/agents/translationAgent.ts` - Parameter parsing and execution
- **Command**: `/translate` with flexible parameter formats
- **Types**: `TranslationAgentConfig` interface
- **Integration**: Full API and UI integration

Key features demonstrated:
- Flexible parameter parsing (3 different command formats)
- Language detection and validation
- Caching support
- Error handling with fallbacks
- Structured response formatting

## Troubleshooting

### Common Issues

1. **TypeScript errors**: Ensure all types are properly imported and configured
2. **Agent not found**: Verify registration in `AgentFactory`
3. **Command not working**: Check `CommandParser` registration
4. **API validation fails**: Update `SUPPORTED_AGENT_TYPES` array
5. **Build failures**: Check all configuration files are updated

### Debug Tips

- Enable verbose logging in development
- Use browser developer tools to inspect API calls
- Check the console for agent execution logs
- Verify environment variables are set correctly

## Architecture Overview

```
User Input → CommandParser → AgentFactory → YourAgent → YourService → Response
     ↓              ↓              ↓           ↓           ↓
/youragent → AgentType.YOUR_AGENT → config → execute() → API call → formatted response
```

The system follows a layered architecture with clear separation of concerns:
- **Presentation Layer**: UI components and command parsing
- **Business Layer**: Agent classes and service logic
- **Data Layer**: API calls and data transformation
- **Configuration Layer**: Type definitions and settings

This guide should help you successfully add new agents to the system. For more specific examples, refer to the existing agent implementations in the codebase.