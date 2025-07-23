import { AgentType } from '@/types/agent';
import { Settings } from '@/types/settings';

/**
 * Command types supported by the chat input system
 */
export enum CommandType {
  AGENT = 'agent',
  SETTINGS = 'settings',
  UTILITY = 'utility',
}

/**
 * Agent selection commands
 */
export enum AgentCommand {
  SEARCH = 'search',
  CODE = 'code',
  URL = 'url',
  KNOWLEDGE = 'knowledge',
  STANDARD = 'standard',
  NO_AGENTS = 'noAgents',
}

/**
 * Settings modification commands
 */
export enum SettingsCommand {
  TEMPERATURE = 'temperature',
  MODEL = 'model',
  DISABLE_AGENTS = 'disableAgents',
  ENABLE_AGENTS = 'enableAgents',
}

/**
 * Utility commands
 */
export enum UtilityCommand {
  HELP = 'help',
  SETTINGS = 'settings',
  PRIVACY_POLICY = 'privacyPolicy',
}

/**
 * Command validation result
 */
export interface CommandValidationResult {
  valid: boolean;
  errors: string[];
  suggestions?: string[];
}

/**
 * Chat response for commands that should add messages to chat history
 */
export interface CommandChatResponse {
  userMessage: string;
  assistantMessage: string;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  success: boolean;
  message?: string;
  agentType?: AgentType;
  settingsChange?: Partial<Settings>;
  utilityAction?: string;
  error?: string;
  chatResponse?: CommandChatResponse;
  immediateAction?: boolean;
}

/**
 * Parsed command structure
 */
export interface ParsedCommand {
  type: CommandType;
  command: string;
  arguments: string[];
  originalInput: string;
  valid: boolean;
  validation?: CommandValidationResult;
}

/**
 * Command definition for display and validation
 */
export interface CommandDefinition {
  command: string;
  type: CommandType;
  description: string;
  usage: string;
  examples: string[];
  validation?: (args: string[], context?: any) => CommandValidationResult;
  execute: (args: string[], context?: any) => CommandExecutionResult;
}

/**
 * CommandParser - Core service for processing slash commands in chat input
 */
export class CommandParser {
  private static instance: CommandParser;
  private commands: Map<string, CommandDefinition> = new Map();

  protected constructor() {
    this.initializeCommands();
  }

  public static getInstance(): CommandParser {
    if (!CommandParser.instance) {
      CommandParser.instance = new CommandParser();
    }
    return CommandParser.instance;
  }

  /**
   * Initialize all supported commands
   */
  private initializeCommands(): void {
    // Agent Commands
    this.registerCommand({
      command: 'search',
      type: CommandType.AGENT,
      description: 'Force web search agent for the current message',
      usage: '/search <query>',
      examples: ['/search latest AI developments', '/search weather today'],
      execute: (args: string[]) => ({
        success: true,
        agentType: AgentType.WEB_SEARCH,
        message: 'Switched to web search agent',
      }),
    });

    // this.registerCommand({
    //   command: 'code',
    //   type: CommandType.AGENT,
    //   description: 'Force code interpreter agent for the current message',
    //   usage: '/code <query>',
    //   examples: ['/code analyze this function', '/code write a Python script'],
    //   execute: (args: string[]) => ({
    //     success: true,
    //     agentType: AgentType.CODE_INTERPRETER,
    //     message: 'Switched to code interpreter agent',
    //   }),
    // });

    this.registerCommand({
      command: 'url',
      type: CommandType.AGENT,
      description: 'Force URL pull agent for the current message',
      usage: '/url <query>',
      examples: [
        '/url summarize https://example.com',
        '/url extract content from this page',
      ],
      execute: (args: string[]) => ({
        success: true,
        agentType: AgentType.URL_PULL,
        message: 'Switched to URL pull agent',
      }),
    });

    this.registerCommand({
      command: 'knowledge',
      type: CommandType.AGENT,
      description: 'Force local knowledge agent for the current message',
      usage: '/knowledge <query>',
      examples: [
        '/knowledge find documents about',
        '/knowledge search internal docs',
      ],
      execute: (args: string[]) => ({
        success: true,
        agentType: AgentType.LOCAL_KNOWLEDGE,
        message: 'Switched to local knowledge agent',
      }),
    });

    this.registerCommand({
      command: 'standard',
      type: CommandType.AGENT,
      description: 'Force standard chat (no agents) for the current message',
      usage: '/standard <query>',
      examples: [
        '/standard just chat normally',
        '/standard basic conversation',
      ],
      execute: (args: string[]) => ({
        success: true,
        agentType: AgentType.STANDARD_CHAT,
        message: 'Using standard chat mode',
      }),
    });

    this.registerCommand({
      command: 'noAgents',
      type: CommandType.AGENT,
      description: 'Disable all agents for the current message',
      usage: '/noAgents <query>',
      examples: [
        '/noAgents simple question',
        '/noAgents basic response needed',
      ],
      execute: (args: string[]) => ({
        success: true,
        agentType: AgentType.STANDARD_CHAT,
        message: 'Agents disabled for this message',
      }),
    });

    // Settings Commands
    this.registerCommand({
      command: 'temperature',
      type: CommandType.SETTINGS,
      description: 'Set the creativity/temperature for responses (0.0 to 1.0)',
      usage: '/temperature <value>',
      examples: [
        '/temperature 0.7',
        '/temperature conservative',
        '/temperature creative',
      ],
      validation: (args: string[]) => this.validateTemperature(args),
      execute: (args: string[]) => this.executeTemperatureChange(args),
    });

    this.registerCommand({
      command: 'model',
      type: CommandType.SETTINGS,
      description: 'Switch the AI model being used',
      usage: '/model <model_name>',
      examples: ['/model gpt-4o', '/model gpt-4o-mini'],
      validation: (args: string[], context?: any) =>
        this.validateModel(args, context),
      execute: (args: string[], context?: any) =>
        this.executeModelChange(args, context),
    });

    this.registerCommand({
      command: 'disableAgents',
      type: CommandType.SETTINGS,
      description: 'Disable all agents for future messages',
      usage: '/disableAgents',
      examples: ['/disableAgents'],
      execute: (args: string[]) => ({
        success: true,
        settingsChange: {
          agentSettings: { enabled: false },
        } as Partial<Settings>,
        immediateAction: true,
        chatResponse: {
          userMessage: '/disableAgents',
          assistantMessage:
            '🚫 **Agents Disabled**\n\nAll AI agents have been disabled for future messages. The chat will use standard processing only.',
        },
      }),
    });

    this.registerCommand({
      command: 'enableAgents',
      type: CommandType.SETTINGS,
      description: 'Enable agents for future messages',
      usage: '/enableAgents',
      examples: ['/enableAgents'],
      execute: (args: string[]) => ({
        success: true,
        settingsChange: {
          agentSettings: { enabled: true },
        } as Partial<Settings>,
        immediateAction: true,
        chatResponse: {
          userMessage: '/enableAgents',
          assistantMessage:
            '✅ **Agents Enabled**\n\nAll AI agents are now enabled and will automatically assist with your queries based on context.',
        },
      }),
    });

    // Utility Commands
    this.registerCommand({
      command: 'help',
      type: CommandType.UTILITY,
      description: 'Show available commands and usage information',
      usage: '/help [command]',
      examples: ['/help', '/help temperature', '/help search'],
      execute: (args: string[]) => this.executeHelp(args),
    });

    this.registerCommand({
      command: 'settings',
      type: CommandType.UTILITY,
      description: 'Open the settings dialog',
      usage: '/settings',
      examples: ['/settings'],
      execute: (args: string[]) => ({
        success: true,
        utilityAction: 'open_settings',
        immediateAction: true,
        // Chat response is shown when typed manually, but skipped when selected from autocomplete
        chatResponse: {
          userMessage: '/settings',
          assistantMessage:
            '⚙️ **Settings Dialog**\n\nOpening the settings dialog where you can customize your chat experience...',
        },
      }),
    });

    this.registerCommand({
      command: 'privacyPolicy',
      type: CommandType.UTILITY,
      description: 'Open settings dialog and navigate to privacy policy',
      usage: '/privacyPolicy',
      examples: ['/privacyPolicy'],
      execute: (args: string[]) => ({
        success: true,
        utilityAction: 'open_privacy_policy',
        immediateAction: true,
        // Chat response is shown when typed manually, but skipped when selected from autocomplete
        chatResponse: {
          userMessage: '/privacyPolicy',
          assistantMessage:
            '📋 **Privacy Policy**\n\nOpening the privacy policy section in settings...',
        },
      }),
    });
  }

  /**
   * Register a new command
   */
  public registerCommand(definition: CommandDefinition): void {
    this.commands.set(definition.command.toLowerCase(), definition);
  }

  /**
   * Parse input text for commands
   */
  public parseInput(input: string, context?: any): ParsedCommand | null {
    const trimmedInput = input.trim();

    // Check if input starts with a slash
    if (!trimmedInput.startsWith('/')) {
      return null;
    }

    // Extract command and arguments
    const parts = trimmedInput.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check if command exists
    const commandDef = this.commands.get(command);
    if (!commandDef) {
      return {
        type: CommandType.UTILITY,
        command,
        arguments: args,
        originalInput: input,
        valid: false,
        validation: {
          valid: false,
          errors: [`Unknown command: /${command}`],
          suggestions: this.getSimilarCommands(command),
        },
      };
    }

    // Validate command if validation function exists
    let validation: CommandValidationResult = { valid: true, errors: [] };
    if (commandDef.validation) {
      validation = commandDef.validation(args, context);
    }

    return {
      type: commandDef.type,
      command,
      arguments: args,
      originalInput: input,
      valid: validation.valid,
      validation,
    };
  }

  /**
   * Execute a parsed command
   */
  public executeCommand(
    parsedCommand: ParsedCommand,
    context?: any,
  ): CommandExecutionResult {
    if (!parsedCommand.valid) {
      return {
        success: false,
        error: parsedCommand.validation?.errors.join(', ') || 'Invalid command',
      };
    }

    const commandDef = this.commands.get(parsedCommand.command);
    if (!commandDef) {
      return {
        success: false,
        error: `Command not found: /${parsedCommand.command}`,
      };
    }

    try {
      return commandDef.execute(parsedCommand.arguments, context);
    } catch (error) {
      return {
        success: false,
        error: `Command execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Get all available commands
   */
  public getAvailableCommands(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by type
   */
  public getCommandsByType(type: CommandType): CommandDefinition[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => cmd.type === type,
    );
  }

  /**
   * Get command suggestions based on partial input
   */
  public getCommandSuggestions(partialCommand: string): CommandDefinition[] {
    const partial = partialCommand.toLowerCase();
    return Array.from(this.commands.values()).filter((cmd) =>
      cmd.command.toLowerCase().startsWith(partial),
    );
  }

  /**
   * Validate temperature command
   */
  private validateTemperature(args: string[]): CommandValidationResult {
    if (args.length === 0) {
      return {
        valid: false,
        errors: ['Temperature value is required'],
        suggestions: [
          'Use values between 0.0 and 1.0, or presets: conservative, balanced, creative',
        ],
      };
    }

    const value = args[0].toLowerCase();

    // Check for preset values
    if (['conservative', 'balanced', 'creative'].includes(value)) {
      return { valid: true, errors: [] };
    }

    // Check for numeric value
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return {
        valid: false,
        errors: [
          'Temperature must be a number between 0.0 and 1.0 or a preset (conservative, balanced, creative)',
        ],
      };
    }

    if (numValue < 0 || numValue > 1) {
      return {
        valid: false,
        errors: ['Temperature must be between 0.0 and 1.0'],
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Execute temperature change
   */
  private executeTemperatureChange(args: string[]): CommandExecutionResult {
    const value = args[0].toLowerCase();
    let temperature: number;
    let presetName: string;

    // Handle presets
    switch (value) {
      case 'conservative':
        temperature = 0.3;
        presetName = 'Conservative';
        break;
      case 'balanced':
        temperature = 0.7;
        presetName = 'Balanced';
        break;
      case 'creative':
        temperature = 0.9;
        presetName = 'Creative';
        break;
      default:
        temperature = parseFloat(value);
        presetName =
          temperature <= 0.4
            ? 'Conservative'
            : temperature <= 0.8
            ? 'Balanced'
            : 'Creative';
    }

    const userCommand = `/temperature ${args[0]}`;
    const assistantMessage = `✅ **Temperature Updated**\n\nTemperature set to **${temperature}** (${presetName} mode)\n\n${this.getTemperatureDescription(
      temperature,
    )}`;

    return {
      success: true,
      settingsChange: { temperature } as Partial<Settings>,
      chatResponse: {
        userMessage: userCommand,
        assistantMessage: assistantMessage,
      },
    };
  }

  /**
   * Get description for temperature value
   */
  private getTemperatureDescription(temperature: number): string {
    if (temperature <= 0.4) {
      return '*More focused and consistent responses.*';
    } else if (temperature <= 0.8) {
      return '*Balanced creativity and consistency.*';
    } else {
      return '*More creative and varied responses.*';
    }
  }

  /**
   * Validate model command
   */
  private validateModel(
    args: string[],
    context?: any,
  ): CommandValidationResult {
    if (args.length === 0) {
      const availableModelNames = context?.models?.map((m: any) => m.id) || [
        'gpt-4',
        'gpt-3.5-turbo',
      ];
      return {
        valid: false,
        errors: ['Model name is required'],
        suggestions: [
          `Available models: ${availableModelNames.slice(0, 5).join(', ')}`,
        ],
      };
    }

    // Get available models from context, fallback to hardcoded list
    const availableModels = context?.models || [];
    const availableModelIds = availableModels.map((m: any) =>
      m.id.toLowerCase(),
    );

    const inputModel = args[0].toLowerCase();

    // Check for exact ID match
    if (availableModelIds.includes(inputModel)) {
      return { valid: true, errors: [] };
    }

    // Check for partial name match
    const partialMatches = availableModels.filter(
      (m: any) =>
        m.id.toLowerCase().includes(inputModel) ||
        (m.name && m.name.toLowerCase().includes(inputModel)),
    );

    if (partialMatches.length === 1) {
      return { valid: true, errors: [] };
    } else if (partialMatches.length > 1) {
      return {
        valid: false,
        errors: [`Multiple models match "${inputModel}"`],
        suggestions: [
          `Did you mean: ${partialMatches
            .slice(0, 3)
            .map((m: any) => m.id)
            .join(', ')}?`,
        ],
      };
    }

    // No matches found
    const availableList =
      availableModelIds.length > 0
        ? availableModelIds
        : ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo'];
    return {
      valid: false,
      errors: [`Unknown model: ${inputModel}`],
      suggestions: [
        `Available models: ${availableList.slice(0, 5).join(', ')}`,
      ],
    };
  }

  /**
   * Execute model change
   */
  private executeModelChange(
    args: string[],
    context?: any,
  ): CommandExecutionResult {
    const inputModel = args[0].toLowerCase();
    const availableModels = context?.models || [];

    // Find the exact model
    let selectedModel = availableModels.find(
      (m: any) => m.id.toLowerCase() === inputModel,
    );

    // If not found, try partial match
    if (!selectedModel) {
      const partialMatches = availableModels.filter(
        (m: any) =>
          m.id.toLowerCase().includes(inputModel) ||
          (m.name && m.name.toLowerCase().includes(inputModel)),
      );

      if (partialMatches.length === 1) {
        selectedModel = partialMatches[0];
      } else {
        return {
          success: false,
          error:
            partialMatches.length > 1
              ? `Multiple models match "${inputModel}". Be more specific.`
              : `Model "${inputModel}" not found.`,
        };
      }
    }

    const userCommand = `/model ${args[0]}`;
    const modelName = selectedModel.name || selectedModel.id;
    const modelType = selectedModel.modelType
      ? ` (${selectedModel.modelType})`
      : '';
    const assistantMessage = `🤖 **Model Updated**\n\nSwitched to **${modelName}**${modelType}\n\n*Token limit: ${
      selectedModel.tokenLimit?.toLocaleString() || 'Unknown'
    }*`;

    return {
      success: true,
      settingsChange: {
        model: selectedModel,
        // Include the model update for conversation
        selectedModel: selectedModel,
      } as Partial<Settings>,
      chatResponse: {
        userMessage: userCommand,
        assistantMessage: assistantMessage,
      },
    };
  }

  /**
   * Execute help command
   */
  private executeHelp(args: string[]): CommandExecutionResult {
    if (args.length === 0) {
      // General help - format as markdown for chat display
      const agentCommands = this.getCommandsByType(CommandType.AGENT);
      const settingsCommands = this.getCommandsByType(CommandType.SETTINGS);
      const utilityCommands = this.getCommandsByType(CommandType.UTILITY);

      const helpMarkdown = [
        '# Available Commands',
        '',
        '## 🤖 Agent Commands',
        'Force specific agents for your queries:',
        ...agentCommands.map(
          (cmd) => `- **/${cmd.command}** - ${cmd.description}`,
        ),
        '',
        '## ⚙️ Settings Commands',
        'Modify chat settings and preferences:',
        ...settingsCommands.map(
          (cmd) => `- **/${cmd.command}** - ${cmd.description}`,
        ),
        '',
        '## 🔧 Utility Commands',
        'Access help and application features:',
        ...utilityCommands.map(
          (cmd) => `- **/${cmd.command}** - ${cmd.description}`,
        ),
        '',
        '---',
        '*Use `/help <command>` for detailed information about any command.*',
      ].join('\n');

      return {
        success: true,
        chatResponse: {
          userMessage: '/help',
          assistantMessage: helpMarkdown,
        },
      };
    } else {
      // Specific command help
      const commandName = args[0].toLowerCase();
      const commandDef = this.commands.get(commandName);

      if (!commandDef) {
        return {
          success: false,
          error: `Command not found: /${commandName}`,
        };
      }

      const helpMarkdown = [
        `# /${commandDef.command}`,
        '',
        `**Description:** ${commandDef.description}`,
        '',
        `**Usage:** \`${commandDef.usage}\``,
        '',
        '**Examples:**',
        ...commandDef.examples.map((ex) => `- \`${ex}\``),
      ].join('\n');

      return {
        success: true,
        chatResponse: {
          userMessage: `/help ${commandName}`,
          assistantMessage: helpMarkdown,
        },
      };
    }
  }

  /**
   * Get similar commands for suggestions
   */
  private getSimilarCommands(input: string): string[] {
    const commands = Array.from(this.commands.keys());
    return commands
      .filter(
        (cmd) =>
          cmd.includes(input) || this.levenshteinDistance(cmd, input) <= 2,
      )
      .slice(0, 3)
      .map((cmd) => `/${cmd}`);
  }

  /**
   * Calculate Levenshtein distance for command suggestions
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export default CommandParser;
