import { ToolType } from '@/types/chat';

import { Tool } from './Tool';

/**
 * ToolRegistry
 *
 * Central registry for all available tools.
 * Manages tool registration, lookup, and execution.
 *
 * Makes it easy to add new tools in the future:
 * 1. Create new tool class implementing Tool interface
 * 2. Register it in the constructor
 * 3. Update ToolType in types/chat.ts
 * 4. Update ToolRouterService prompt to include the new tool
 */
export class ToolRegistry {
  private tools: Map<ToolType, Tool> = new Map();

  /**
   * Registers a tool in the registry.
   *
   * @param tool - Tool instance to register
   */
  register(tool: Tool): void {
    this.tools.set(tool.type, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name} (${tool.type})`);
  }

  /**
   * Gets a tool by its type.
   *
   * @param type - Tool type to retrieve
   * @returns Tool instance or undefined if not found
   */
  getTool(type: ToolType): Tool | undefined {
    return this.tools.get(type);
  }

  /**
   * Gets all registered tools.
   *
   * @returns Array of all tool instances
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Checks if a tool type is registered.
   *
   * @param type - Tool type to check
   * @returns true if tool is registered, false otherwise
   */
  hasTool(type: ToolType): boolean {
    return this.tools.has(type);
  }

  /**
   * Gets list of all registered tool types.
   *
   * @returns Array of tool types
   */
  getToolTypes(): ToolType[] {
    return Array.from(this.tools.keys());
  }
}
