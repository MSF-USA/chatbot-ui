import { CodeInterpreterAgent } from '../../../services/agents/codeInterpreterAgent';
import { CodeInterpreterService } from '../../../services/codeInterpreterService';

import {
  AgentExecutionContext,
  AgentExecutionEnvironment,
  AgentType,
  CodeInterpreterAgentConfig,
} from '../../../types/agent';
import {
  CodeExecutionResult,
  DEFAULT_CODE_INTERPRETER_CONFIG,
  ExecutionStatus,
  ProgrammingLanguage,
} from '../../../types/codeInterpreter';
import { OpenAIModel } from '../../../types/openai';

import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the CodeInterpreterService
vi.mock('../../../services/codeInterpreterService', () => ({
  CodeInterpreterService: vi.fn().mockImplementation(() => ({
    executeCode: vi.fn(),
    analyzeCode: vi.fn(),
    cleanup: vi.fn(),
  })),
}));

const MockedCodeInterpreterService = CodeInterpreterService as any as Mock;

describe('CodeInterpreterAgent', () => {
  let agent: CodeInterpreterAgent;
  let config: CodeInterpreterAgentConfig;
  let context: AgentExecutionContext;
  let mockService: any;

  beforeEach(() => {
    config = {
      id: 'test-code-interpreter-agent',
      name: 'Test Code Interpreter Agent',
      type: AgentType.CODE_INTERPRETER,
      environment: AgentExecutionEnvironment.CODE,
      modelId: 'gpt-4o-mini',
      instructions: 'Test agent for code execution',
      tools: [],
      codeInterpreterConfig: {
        ...DEFAULT_CODE_INTERPRETER_CONFIG,
        defaultTimeout: 5000,
        maxMemoryMb: 256,
      },
      maxExecutionTime: 5000,
      maxMemoryMb: 256,
      enableValidation: true,
      enableCaching: true,
      cacheTtl: 3600,
      enableFileHandling: true,
      maxFileSizeMb: 10,
      allowedLanguages: ['python', 'javascript', 'sql'],
      enableSecurityScanning: true,
    };

    context = {
      query: 'Execute this Python code: ```python\nprint("Hello, World!")\n```',
      messages: [],
      // @ts-expect-error Don't need the full object structure for these tests
      user: {
        id: 'test-user',
        displayName: 'Test User',
        mail: 'test@example.com',
      },
      model: { id: 'gpt-4o-mini' } as OpenAIModel,
      locale: 'en',
      correlationId: 'test-correlation-id',
    };

    // Reset mocks
    MockedCodeInterpreterService.mockClear();
    mockService = {
      executeCode: vi.fn(),
      analyzeCode: vi.fn(),
      cleanup: vi.fn(),
    };
    MockedCodeInterpreterService.mockImplementation(() => mockService);

    agent = new CodeInterpreterAgent(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create CodeInterpreterAgent with correct configuration', () => {
      expect(agent).toBeInstanceOf(CodeInterpreterAgent);
      expect(MockedCodeInterpreterService).toHaveBeenCalledOnce();
    });

    it('should detect missing configuration in validation', () => {
      const invalidConfig = { ...config };
      delete (invalidConfig as any).codeInterpreterConfig;

      const agent = new CodeInterpreterAgent(invalidConfig);
      const errors = agent['validateSpecificConfig']();
      expect(errors).toContain('Code interpreter configuration is required');
    });
  });

  describe('Code Block Extraction', () => {
    it('should extract Python code block from query', async () => {
      const pythonCode = 'print("Hello, World!")';
      context.query = `Execute this Python code:\n\`\`\`python\n${pythonCode}\n\`\`\``;

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.PYTHON,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        code: pythonCode,
        language: ProgrammingLanguage.PYTHON,
        environment: 'python-3.11',
        outputs: [
          {
            output: 'Hello, World!',
            type: 'stdout',
            mimeType: 'text/plain',
          },
        ],
        stats: {
          executionTime: 100,
          memoryUsage: 10,
          cpuUsage: 5,
          outputLines: 1,
          outputSize: 13,
          dependenciesUsed: 0,
          exitCode: 0,
        },
        metadata: {
          executionId: 'test-exec-1',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Hello, World!');
      expect(mockService.executeCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: pythonCode,
          language: ProgrammingLanguage.PYTHON,
        }),
      );
    });

    it('should extract JavaScript code block from query', async () => {
      const jsCode = 'console.log("Hello, JavaScript!");';
      context.query = `Run this JavaScript:\n\`\`\`javascript\n${jsCode}\n\`\`\``;

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.JAVASCRIPT,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        code: jsCode,
        language: ProgrammingLanguage.JAVASCRIPT,
        environment: 'node-18',
        outputs: [
          {
            output: 'Hello, JavaScript!',
            type: 'stdout',
            mimeType: 'text/plain',
          },
        ],
        stats: {
          executionTime: 50,
          memoryUsage: 5,
          cpuUsage: 2,
          outputLines: 1,
          outputSize: 18,
          dependenciesUsed: 0,
          exitCode: 0,
        },
        metadata: {
          executionId: 'test-exec-2',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Hello, JavaScript!');
      expect(mockService.executeCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: jsCode,
          language: ProgrammingLanguage.JAVASCRIPT,
        }),
      );
    });

    it('should extract multiple code blocks from query', async () => {
      context.query = `Execute these:\n\`\`\`python\nprint("Python")\n\`\`\`\n\nAnd this:\n\`\`\`javascript\nconsole.log("JS")\n\`\`\``;

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          code: 'print("Python")',
          language: ProgrammingLanguage.PYTHON,
          environment: 'python-3.11',
          outputs: [
            { output: 'Python', type: 'stdout', mimeType: 'text/plain' },
          ],
          stats: {
            executionTime: 100,
            memoryUsage: 10,
            cpuUsage: 5,
            outputLines: 1,
            outputSize: 6,
            dependenciesUsed: 0,
            exitCode: 0,
          },
          metadata: {
            executionId: 'test-1',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
          },
        })
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          code: 'console.log("JS")',
          language: ProgrammingLanguage.JAVASCRIPT,
          environment: 'node-18',
          outputs: [{ output: 'JS', type: 'stdout', mimeType: 'text/plain' }],
          stats: {
            executionTime: 50,
            memoryUsage: 5,
            cpuUsage: 2,
            outputLines: 1,
            outputSize: 2,
            dependenciesUsed: 0,
            exitCode: 0,
          },
          metadata: {
            executionId: 'test-2',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
          },
        });

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Python');
      expect(response.content).toContain('JS');
      expect(mockService.executeCode).toHaveBeenCalledTimes(2);
    });

    it('should handle inline code detection', async () => {
      context.query = 'Calculate: `2 + 2`';

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.PYTHON,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        code: '2 + 2',
        language: ProgrammingLanguage.PYTHON,
        environment: 'python-3.11',
        outputs: [{ output: '4', type: 'stdout', mimeType: 'text/plain' }],
        stats: {
          executionTime: 10,
          memoryUsage: 1,
          cpuUsage: 1,
          outputLines: 1,
          outputSize: 1,
          dependenciesUsed: 0,
          exitCode: 0,
        },
        metadata: {
          executionId: 'test-inline',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockService.executeCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: '2 + 2',
          language: ProgrammingLanguage.PYTHON,
        }),
      );
    });
  });

  describe('Language Detection', () => {
    it('should detect SQL queries', async () => {
      const sqlCode = 'SELECT * FROM users WHERE age > 18';
      context.query = `\`\`\`sql\n${sqlCode}\n\`\`\``;

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.SQL,
        complexity: 2,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        code: sqlCode,
        language: ProgrammingLanguage.SQL,
        environment: 'postgresql',
        outputs: [
          {
            output: 'Query executed successfully',
            type: 'stdout',
            mimeType: 'text/plain',
          },
        ],
        stats: {
          executionTime: 200,
          memoryUsage: 20,
          cpuUsage: 10,
          outputLines: 1,
          outputSize: 25,
          dependenciesUsed: 0,
          exitCode: 0,
        },
        metadata: {
          executionId: 'test-sql',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockService.executeCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: sqlCode,
          language: ProgrammingLanguage.SQL,
        }),
      );
    });

    it('should auto-detect language from code content', async () => {
      context.query = 'Execute: `function add(a, b) { return a + b; }`';

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.JAVASCRIPT,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        code: 'function add(a, b) { return a + b; }',
        language: ProgrammingLanguage.JAVASCRIPT,
        environment: 'node-18',
        outputs: [
          {
            output: 'Function defined',
            type: 'stdout',
            mimeType: 'text/plain',
          },
        ],
        stats: {
          executionTime: 30,
          memoryUsage: 3,
          cpuUsage: 1,
          outputLines: 1,
          outputSize: 16,
          dependenciesUsed: 0,
          exitCode: 0,
        },
        metadata: {
          executionId: 'test-detect',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockService.executeCode).toHaveBeenCalledWith(
        expect.objectContaining({
          language: ProgrammingLanguage.JAVASCRIPT,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      context.query = '```python\nprint(undefined_variable)\n```';

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.PYTHON,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.ERROR,
        code: 'print(undefined_variable)',
        language: ProgrammingLanguage.PYTHON,
        environment: 'python-3.11',
        outputs: [
          {
            output: '',
            error: "NameError: name 'undefined_variable' is not defined",
            type: 'exception',
          },
        ],
        stats: {
          executionTime: 50,
          memoryUsage: 5,
          cpuUsage: 2,
          outputLines: 0,
          outputSize: 0,
          dependenciesUsed: 0,
          exitCode: 1,
        },
        metadata: {
          executionId: 'test-error',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.success).toBe(true); // Agent succeeds even if code fails
      expect(response.content).toContain('NameError');
      expect(response.content).toContain('undefined_variable');
    });

    it('should handle queries without code blocks', async () => {
      context.query = 'How do I write a for loop?';

      const response = await agent.execute(context);

      expect(response.success).toBe(false);
      expect(response.content).toContain('No code blocks found');
      expect(response.error?.code).toBe('NO_CODE_FOUND');
    });

    it('should handle service errors', async () => {
      context.query = '```python\nprint("test")\n```';

      mockService.analyzeCode.mockRejectedValue(
        new Error('Analysis service error'),
      );

      const response = await agent.execute(context);

      expect(response.success).toBe(true); // Agent handles errors gracefully
      expect(response.content).toContain('Error');
    });
  });

  describe('Response Formatting', () => {
    it('should format successful execution response', async () => {
      const pythonCode = 'print("Hello, World!")';
      context.query = `\`\`\`python\n${pythonCode}\n\`\`\``;

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.PYTHON,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        code: pythonCode,
        language: ProgrammingLanguage.PYTHON,
        environment: 'python-3.11',
        outputs: [
          {
            output: 'Hello, World!',
            type: 'stdout',
            mimeType: 'text/plain',
          },
        ],
        stats: {
          executionTime: 100,
          memoryUsage: 10,
          cpuUsage: 5,
          outputLines: 1,
          outputSize: 13,
          dependenciesUsed: 0,
          exitCode: 0,
        },
        metadata: {
          executionId: 'test-format',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Code Execution Results');
      expect(response.content).toContain('Execution Summary');
      expect(response.content).toContain('**Total Code Blocks**: 1');
      expect(response.content).toContain('**Successful**: 1');
      expect(response.content).toContain('**Failed**: 0');
      expect(response.content).toContain('**Languages Used**: python');
      expect(response.content).toContain('Code Block 1 (python)');
      expect(response.content).toContain('✅ **Status**: Success');
      expect(response.content).toContain('Hello, World!');
      expect(response.content).toContain('Execution Time: 100ms');
      expect(response.content).toContain('Memory Usage: 10MB');
    });

    it('should include metadata in response', async () => {
      context.query = '```python\nprint("test")\n```';

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.PYTHON,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        code: 'print("test")',
        language: ProgrammingLanguage.PYTHON,
        environment: 'python-3.11',
        outputs: [{ output: 'test', type: 'stdout', mimeType: 'text/plain' }],
        stats: {
          executionTime: 50,
          memoryUsage: 5,
          cpuUsage: 2,
          outputLines: 1,
          outputSize: 4,
          dependenciesUsed: 0,
          exitCode: 0,
        },
        metadata: {
          executionId: 'test-meta',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.metadata?.agentMetadata).toBeDefined();
      expect(response.metadata?.agentMetadata?.totalCodeBlocks).toBe(1);
      expect(response.metadata?.agentMetadata?.successfulExecutions).toBe(1);
      expect(response.metadata?.agentMetadata?.failedExecutions).toBe(0);
      expect(response.metadata?.agentMetadata?.languagesUsed).toEqual([
        ProgrammingLanguage.PYTHON,
      ]);
      expect(response.metadata?.processingTime).toBeGreaterThanOrEqual(0);
      expect(response.metadata?.confidence).toBeGreaterThan(0);
    });

    it('should calculate confidence score appropriately', async () => {
      context.query = '```python\nprint("test")\n```';

      mockService.analyzeCode.mockResolvedValue({
        isValid: true,
        detectedLanguage: ProgrammingLanguage.PYTHON,
        complexity: 1,
        securityRisk: 'low',
        issues: [],
        dependencies: [],
        optimizations: [],
      });

      mockService.executeCode.mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        code: 'print("test")',
        language: ProgrammingLanguage.PYTHON,
        environment: 'python-3.11',
        outputs: [{ output: 'test', type: 'stdout', mimeType: 'text/plain' }],
        stats: {
          executionTime: 500,
          memoryUsage: 5,
          cpuUsage: 2,
          outputLines: 1,
          outputSize: 4,
          dependenciesUsed: 0,
          exitCode: 0,
        },
        metadata: {
          executionId: 'test-confidence',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const response = await agent.execute(context);

      expect(response.metadata?.confidence).toBeGreaterThan(0);
      expect(response.metadata?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate agent configuration', () => {
      const errors = agent['validateSpecificConfig']();
      expect(errors).toEqual([]);
    });

    it('should detect invalid execution time', () => {
      const invalidConfig = { ...config, maxExecutionTime: -1 };
      const invalidAgent = new CodeInterpreterAgent(invalidConfig);

      const errors = invalidAgent['validateSpecificConfig']();
      expect(errors).toContain('Maximum execution time must be greater than 0');
    });

    it('should detect invalid memory limit in validation', () => {
      const invalidConfig = { ...config, maxMemoryMb: 0 };

      const agent = new CodeInterpreterAgent(invalidConfig);
      const errors = agent['validateSpecificConfig']();
      expect(errors).toContain('Maximum memory must be greater than 0');
    });
  });

  describe('Capabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = agent['getCapabilities']();
      expect(capabilities).toContain('code-execution');
      expect(capabilities).toContain('python-support');
      expect(capabilities).toContain('javascript-support');
      expect(capabilities).toContain('sql-support');
      expect(capabilities).toContain('data-analysis');
      expect(capabilities).toContain('debugging');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await agent.cleanup();
      expect(mockService.cleanup).toHaveBeenCalledOnce();
    });
  });
});
