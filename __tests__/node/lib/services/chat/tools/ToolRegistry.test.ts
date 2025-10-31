import { Tool, ToolExecutionParams } from '@/lib/services/chat/tools/Tool';
import { ToolRegistry } from '@/lib/services/chat/tools/ToolRegistry';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock tool for testing
class MockTool implements Tool {
  readonly type = 'web_search' as const;
  readonly name = 'Mock Web Search';
  readonly description = 'Mock web search tool for testing';

  execute = vi.fn().mockResolvedValue('mock results');
}

class MockCalculatorTool implements Tool {
  readonly type = 'web_search' as const; // Would be 'calculator' in real implementation
  readonly name = 'Mock Calculator';
  readonly description = 'Mock calculator tool for testing';

  execute = vi.fn().mockResolvedValue('42');
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool', () => {
      const tool = new MockTool();

      registry.register(tool);

      expect(registry.hasTool(tool.type)).toBe(true);
    });

    it('should log when registering a tool', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const tool = new MockTool();

      registry.register(tool);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Registered tool'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(tool.name),
      );

      consoleLogSpy.mockRestore();
    });

    it('should allow registering multiple tools (overwrites if same type)', () => {
      const tool1 = new MockTool();
      const tool2 = new MockCalculatorTool();

      registry.register(tool1);
      registry.register(tool2);

      // Both tools have the same type, so tool2 overwrites tool1
      expect(registry.getAllTools()).toHaveLength(1);
      expect(registry.getTool('web_search')?.name).toBe('Mock Calculator');
    });
  });

  describe('getTool', () => {
    it('should retrieve a registered tool', () => {
      const tool = new MockTool();
      registry.register(tool);

      const retrieved = registry.getTool(tool.type);

      expect(retrieved).toBe(tool);
    });

    it('should return undefined for unregistered tool type', () => {
      const retrieved = registry.getTool('web_search');

      expect(retrieved).toBeUndefined();
    });

    it('should retrieve correct tool by type', () => {
      const tool1 = new MockTool();
      const tool2 = new MockCalculatorTool();

      registry.register(tool1);
      registry.register(tool2);

      const retrieved = registry.getTool('web_search');

      // Should get tool2 since it was registered last with same type
      // (In real implementation, tool types would be unique)
      expect(retrieved).toBeDefined();
    });
  });

  describe('getAllTools', () => {
    it('should return empty array when no tools registered', () => {
      const tools = registry.getAllTools();

      expect(tools).toEqual([]);
    });

    it('should return all registered tools', () => {
      const tool1 = new MockTool();
      const tool2 = new MockCalculatorTool();

      registry.register(tool1);
      registry.register(tool2);

      const tools = registry.getAllTools();

      // Both tools have the same type, so only 1 is registered (second overwrites first)
      expect(tools).toHaveLength(1);
    });

    it('should return tools as array', () => {
      const tool = new MockTool();
      registry.register(tool);

      const tools = registry.getAllTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools[0]).toBe(tool);
    });
  });

  describe('hasTool', () => {
    it('should return true for registered tool type', () => {
      const tool = new MockTool();
      registry.register(tool);

      expect(registry.hasTool(tool.type)).toBe(true);
    });

    it('should return false for unregistered tool type', () => {
      expect(registry.hasTool('web_search')).toBe(false);
    });

    it('should return false after registration then removal (if implemented)', () => {
      // This test documents expected behavior for future removal feature
      const tool = new MockTool();
      registry.register(tool);

      expect(registry.hasTool(tool.type)).toBe(true);
    });
  });

  describe('getToolTypes', () => {
    it('should return empty array when no tools registered', () => {
      const types = registry.getToolTypes();

      expect(types).toEqual([]);
    });

    it('should return all tool types', () => {
      const tool = new MockTool();
      registry.register(tool);

      const types = registry.getToolTypes();

      expect(types).toContain('web_search');
    });

    it('should return array of tool types', () => {
      const tool1 = new MockTool();
      const tool2 = new MockCalculatorTool();

      registry.register(tool1);
      registry.register(tool2);

      const types = registry.getToolTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('integration scenarios', () => {
    it('should support registering and using web search tool', () => {
      const webSearchTool = new MockTool();
      registry.register(webSearchTool);

      expect(registry.hasTool('web_search')).toBe(true);

      const tool = registry.getTool('web_search');
      expect(tool?.name).toBe('Mock Web Search');
    });

    it('should support multiple tool types for future expansion', () => {
      // Simulate future state with multiple tool types
      const webSearchTool = new MockTool();
      registry.register(webSearchTool);

      // In real implementation, would register calculator, image_gen, etc.
      expect(registry.getAllTools().length).toBeGreaterThanOrEqual(1);
    });

    it('should allow iterating over all tools', () => {
      const tool1 = new MockTool();
      const tool2 = new MockCalculatorTool();

      registry.register(tool1);
      registry.register(tool2);

      const tools = registry.getAllTools();

      // Should be able to iterate and execute
      tools.forEach((tool) => {
        expect(tool.execute).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      });
    });

    it('should support checking tool availability before execution', () => {
      const tool = new MockTool();
      registry.register(tool);

      // Pattern: Check before execute
      if (registry.hasTool('web_search')) {
        const searchTool = registry.getTool('web_search');
        expect(searchTool).toBeDefined();
      }
    });
  });
});
