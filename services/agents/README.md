# Agent Development Guide

This guide explains how to add new agents to the chatbot system using the **centralized agent configuration system**. The process has been dramatically simplified from the previous 25+ file modification requirement to just **2 simple steps**.

## Adding a New Agent

### Overview of the System

The agent system now uses a **centralized configuration approach** with a single source of truth:

- **Centralized Registry**: All agent configurations in `/config/agents/registry.ts`
- **Automatic Processing**: Configurations automatically distributed throughout the application
- **Type Safety**: Comprehensive TypeScript schemas for all configuration options
- **Zero Duplication**: No more scattered configuration files to maintain

---

## Step 1: Add Agent Definition to Centralized Registry

Add your agent definition to `/config/agents/registry.ts` in the `AGENT_DEFINITIONS` object:

```typescript
[AgentType.YOUR_AGENT]: {
  metadata: {
    type: AgentType.YOUR_AGENT,
    name: 'Your Agent Name',
    description: 'Brief description of what your agent does',
    version: '1.0.0',
    enabled: true,
  },
  commands: {
    primary: 'youragent',
    aliases: ['ya', 'your'],
    usage: '/youragent <parameters>',
    examples: [
      '/youragent process this data',
      '/ya analyze content',
      '/your help me with task'
    ],
  },
  execution: {
    environment: AgentExecutionEnvironment.FOUNDRY, // or FOUNDRY, CODE, LOCAL, THIRD_PARTY
    timeout: 30000,
    skipStandardChatProcessing: false, // true for direct responses
    supportedModels: ['gpt-4o', 'gpt-4o-mini'],
    capabilities: [
      'data-processing',
      'content-analysis',
      'custom-capability',
    ],
    temperature: 0.7,
  },
  ui: {
    color: '#6366F1', // Tailwind color or hex
    icon: 'cog', // Icon identifier
    displayOrder: 6,
    showInSelector: true,
  },
  api: {
    defaultConfig: {
      maxResults: 10,
      enableFeature: true,
      timeout: 30000,
      customSetting: 'default-value',
    },
    caching: {
      enabled: true,
      ttl: 300, // 5 minutes
      keyPrefix: 'your_agent_',
    },
  },
  error: {
    maxRetries: 2,
    retryDelay: 1000,
    fallbackAgent: AgentType.STANDARD_CHAT,
    strategies: {
      timeout: 'retry',
      validation: 'fail',
      network: 'retry',
    },
  },
  features: {
    intentAnalysis: {
      keywords: ['process', 'analyze', 'help'],
      confidenceThreshold: 0.7,
    },
    parameterExtraction: {
      patterns: {
        dataType: /type:(\w+)/i,
      },
      defaults: {
        format: 'json',
      },
    },
  },
  implementation: {
    agentClass: '@/services/agents/yourAgent',
    serviceClass: '@/services/yourAgentService', // optional
  },
},
```

## Step 2: Create Agent Implementation Class

Create your agent class in `/services/agents/yourAgent.ts`:

```typescript
import { BaseAgent } from './baseAgent';
import { AgentConfig, AgentExecutionContext, AgentResponse } from '@/types/agent';
import { YourAgentService } from '@/services/yourAgentService'; // if using separate service

export class YourAgent extends BaseAgent<AgentConfig> {
  private service?: YourAgentService;

  constructor(config: AgentConfig) {
    super(config);
    // Initialize service if needed
    this.service = new YourAgentService();
  }

  async execute(context: AgentExecutionContext): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Parse parameters from the query
      const params = this.parseParameters(context.query);
      
      // Process the request (either directly or via service)
      const result = this.service 
        ? await this.service.processRequest(params)
        : await this.directProcess(params);
      
      // Return formatted response
      return {
        content: result.content,
        agentType: this.config.type,
        agentId: this.config.id,
        structuredContent: result.structuredContent,
        metadata: {
          confidence: result.confidence || 0.8,
          processingTime: Date.now() - startTime,
          parameters: params,
        },
      };
    } catch (error) {
      this.logError('Agent execution failed', error as Error);
      throw new Error(`${this.config.type} agent execution failed: ${(error as Error).message}`);
    }
  }

  private parseParameters(query: string): any {
    // Extract parameters from query
    // This will automatically use centralized parameter extraction rules
    // if defined in the agent configuration
    return {
      rawQuery: query,
      // ... parsed parameters
    };
  }

  private async directProcess(params: any): Promise<any> {
    // Direct processing logic if not using separate service
    return {
      content: `Processed: ${params.rawQuery}`,
      confidence: 0.9,
    };
  }
}

// Export for dynamic loading
export default YourAgent;
```

## Step 3: Create Service Class (Optional)

If your agent needs complex business logic, create a separate service class:

```typescript
// /services/yourAgentService.ts
export class YourAgentService {
  constructor() {
    // Initialize any required clients, configurations, etc.
  }

  async processRequest(params: any): Promise<any> {
    // Complex business logic
    // API calls, data processing, etc.
    
    return {
      content: 'Processed result',
      structuredContent: {
        data: [],
        metadata: {},
      },
      confidence: 0.9,
    };
  }
}
```

---

At this point, your agent is now fully integrated and automatically available throughout the application:

- **Command Parser**: Slash commands should be automatically registered
- **Agent Factory**: Factory registration automatic
- **API Routes**: Endpoint configuration automatic
- **UI Integration**: Colors, icons, settings automatic
- **Error Handling**: Retry logic and fallbacks automatic

---

## Configuration Schema Reference

### Agent Definition Structure

```typescript
interface AgentDefinition {
  metadata: AgentMetadata;        // Required: Basic agent info
  commands?: AgentCommandConfig;  // Optional: Slash command setup
  execution: AgentExecutionConfig; // Required: Runtime settings
  ui?: AgentUIConfig;            // Optional: UI appearance
  api: AgentAPIConfig;           // Required: API and defaults
  error?: AgentErrorConfig;      // Optional: Error handling
  features?: AgentFeatureConfig; // Optional: Advanced features
  implementation: AgentImplementationConfig; // Required: Class paths
}
```

### Metadata Configuration

```typescript
metadata: {
  type: AgentType.YOUR_AGENT,     // Required: Unique agent identifier
  name: 'Display Name',           // Required: Human-readable name
  description: 'What it does',    // Required: Brief description
  version: '1.0.0',              // Optional: Version string
  enabled: true,                  // Required: Whether agent is active
  developmentOnly: false,         // Optional: Dev environment only
}
```

### Commands Configuration

```typescript
commands: {
  primary: 'youragent',          // Required: Main command name
  aliases: ['ya', 'your'],       // Optional: Alternative commands
  usage: '/youragent <params>',  // Required: Usage description
  examples: [                    // Required: Example usage
    '/youragent example one',
    '/ya short example',
  ],
  hidden: false,                 // Optional: Hide from help
}
```

### Execution Configuration

```typescript
execution: {
  environment: AgentExecutionEnvironment.FOUNDRY, // Required: Runtime env
  timeout: 30000,                          // Optional: Max execution time
  skipStandardChatProcessing: false,       // Optional: Direct response mode
  supportedModels: ['gpt-4o', 'gpt-4o-mini'], // Optional: Compatible models
  capabilities: ['cap1', 'cap2'],          // Required: Agent capabilities
  maxConcurrency: 5,                       // Optional: Concurrent limit
  temperature: 0.7,                        // Optional: AI temperature
}
```

### UI Configuration

```typescript
ui: {
  color: '#6366F1',              // Optional: Primary color
  icon: 'cog',                   // Optional: Icon identifier
  displayOrder: 6,               // Optional: Sort order
  showInSelector: true,          // Optional: Show in UI selectors
  cssClasses: ['custom-class'],  // Optional: Custom CSS classes
}
```

### API Configuration

```typescript
api: {
  defaultConfig: {               // Required: Default settings
    setting1: 'value1',
    setting2: true,
    timeout: 30000,
  },
  configSchema: {                // Optional: Validation schema
    // JSON schema for validation
  },
  caching: {                     // Optional: Cache configuration
    enabled: true,
    ttl: 300,
    keyPrefix: 'your_agent_',
  },
  rateLimit: {                   // Optional: Rate limiting
    maxRequests: 100,
    windowMs: 60000,
  },
}
```

### Error Configuration

```typescript
error: {
  maxRetries: 2,                 // Optional: Retry attempts
  retryDelay: 1000,             // Optional: Delay between retries
  fallbackAgent: AgentType.STANDARD_CHAT, // Optional: Fallback agent
  strategies: {                  // Optional: Error handling strategies
    timeout: 'retry',
    validation: 'fail',
    network: 'retry',
  },
  errorMessages: {               // Optional: Custom error messages
    timeout: 'Request timed out',
    validation: 'Invalid input',
  },
}
```

### Features Configuration

```typescript
features: {
  intentAnalysis: {              // Optional: Auto-detection rules
    keywords: ['keyword1', 'keyword2'],
    patterns: [/regex-pattern/gi],
    confidenceThreshold: 0.7,
  },
  parameterExtraction: {         // Optional: Parameter parsing
    patterns: {
      paramName: /pattern/gi,
    },
    defaults: {
      defaultParam: 'value',
    },
    validators: {
      paramName: (value) => typeof value === 'string',
    },
  },
}
```

### Implementation Configuration

```typescript
implementation: {
  agentClass: '@/services/agents/yourAgent',    // Required: Agent class path
  serviceClass: '@/services/yourAgentService',  // Optional: Service class path
  dependencies: ['dep1', 'dep2'],               // Optional: External deps
  lazyLoad: true,                               // Optional: Lazy loading
}
```

---

## Real Examples

### Simple Agent (Direct Processing)

```typescript
[AgentType.ECHO]: {
  metadata: {
    type: AgentType.ECHO,
    name: 'Echo Agent',
    description: 'Repeats user input with formatting',
    enabled: true,
  },
  commands: {
    primary: 'echo',
    usage: '/echo <text>',
    examples: ['/echo Hello World!'],
  },
  execution: {
    environment: AgentExecutionEnvironment.FOUNDRY,
    capabilities: ['text-processing'],
  },
  api: {
    defaultConfig: {
      prefix: 'Echo: ',
      uppercase: false,
    },
  },
  implementation: {
    agentClass: '@/services/agents/echoAgent',
  },
}
```

### Complex Agent (Service-Based)

```typescript
[AgentType.TRANSLATION]: {
  metadata: {
    type: AgentType.TRANSLATION,
    name: 'Translation Agent',
    description: 'Translate text between languages with automatic language detection',
    enabled: true,
  },
  commands: {
    primary: 'translate',
    aliases: ['tr', 'trans'],
    usage: '/translate [source_lang] <target_lang> <text>',
    examples: [
      '/translate es Hello world',
      '/tr en zh 你好世界',
    ],
  },
  execution: {
    environment: AgentExecutionEnvironment.FOUNDRY,
    timeout: 15000,
    skipStandardChatProcessing: true, // Direct response
    capabilities: [
      'text-translation',
      'language-detection',
      'multi-language-support',
    ],
    temperature: 0.3,
  },
  ui: {
    color: '#EA580C',
    icon: 'translate',
    displayOrder: 5,
  },
  api: {
    defaultConfig: {
      defaultTargetLanguage: 'en',
      enableLanguageDetection: true,
      maxTextLength: 10000,
    },
    caching: {
      enabled: true,
      ttl: 3600,
      keyPrefix: 'translation_',
    },
  },
  error: {
    maxRetries: 2,
    strategies: {
      language_detection_failed: 'retry',
      translation_failed: 'retry',
      invalid_language: 'fail',
    },
  },
  features: {
    intentAnalysis: {
      keywords: ['translate', 'translation', 'language'],
      confidenceThreshold: 0.9,
    },
    parameterExtraction: {
      patterns: {
        languageCode: /^[a-zA-Z]{2,5}([_-][a-zA-Z]{2,5})?$/,
      },
      defaults: {
        targetLanguage: 'en',
      },
    },
  },
  implementation: {
    agentClass: '@/services/agents/translationAgent',
    serviceClass: '@/services/translationService',
  },
}
```

---

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
- Start development server: `npm run dev`
- Use your slash command in chat: `/youragent test query`
- Verify agent responds correctly
- Test error scenarios

### 4. API Testing
```bash
curl -X POST /api/v2/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "your_agent",
    "query": "test query",
    "config": {}
  }'
```

---

## Best Practices

### Configuration
- **Use descriptive names**: Make agent purpose clear
- **Provide good examples**: Include realistic command usage
- **Set appropriate timeouts**: Consider operation complexity
- **Enable caching**: For expensive operations
- **Configure error handling**: Provide graceful degradation

### Implementation
- **Extend BaseAgent**: Use the provided base class
- **Handle errors gracefully**: Wrap operations in try-catch
- **Log important events**: Use built-in logging methods
- **Validate inputs**: Check parameters before processing
- **Return structured responses**: Include metadata and confidence

### Performance
- **Use caching**: Enable for repeated operations
- **Set reasonable timeouts**: Balance UX and reliability
- **Consider memory usage**: For large data processing
- **Implement proper cleanup**: Release resources appropriately

---

## Troubleshooting

### Agent Not Available
- Check `enabled: true` in registry
- Verify agent type is in enum
- Ensure implementation class exists
- Check for build errors

### Command Not Working
- Verify command configuration in registry
- Check for command name conflicts
- Ensure examples are correct
- Test command parsing

### API Errors
- Check agent configuration schema
- Verify supported models list
- Test with default configuration
- Check error handling setup

### Build Failures
- Run `npm run lint` and/or `npm run typecheck` for type errors
- Check import paths are correct
- Verify all required fields present
- Validate configuration schema

---

## Architecture Overview

```
User Input → Centralized Registry → Auto-Generated Configs → Agent Execution
     ↓               ↓                      ↓                    ↓
/youragent → AgentDefinition → CommandParser/Factory/API → YourAgent.execute()
```

The centralized system automatically:
- **Registers commands** in CommandParser
- **Creates factory entries** in AgentFactory  
- **Configures API endpoints** in route handlers
- **Sets up UI elements** with colors and icons
- **Handles errors** with retry logic and fallbacks
- **Processes parameters** using extraction rules
- **Manages caching** and rate limiting

This guide reflects the new simplified architecture. For questions or issues, refer to existing agent implementations in `/services/agents/` or the centralized configuration examples in `/config/agents/registry.ts`.