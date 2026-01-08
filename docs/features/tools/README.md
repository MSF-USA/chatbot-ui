# Tools Feature

This document provides an overview of the Tools feature in the AI Assistant application. The Tools feature allows the assistant to extend its capabilities beyond simple text generation by executing specific functions during the chat process.

Currently, the primary tool implemented is **Web Search**, which enables the assistant to fetch real-time information from the web.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Key Documentation](#key-documentation)
4. [Quick Start for Developers](#quick-start-for-developers)

---

## Overview

The Tools feature is designed as a modular system within the `ChatPipeline`. It uses an intelligent routing mechanism to determine when a tool should be executed based on the user's query and the current context.

### Current Tools

- **Web Search**: Uses AI Foundry agents to perform web searches and provide up-to-date information with citations.

---

## Core Components

The feature is built upon several key components:

- **Tool Interface**: A standard interface for all tools (`Tool.ts`).
- **Tool Registry**: A central repository for managing available tools (`ToolRegistry.ts`).
- **Tool Router Service**: An AI-powered service that decides which tools are needed (`ToolRouterService.ts`).
- **Tool Router Enricher**: A pipeline stage that orchestrates tool selection and execution (`ToolRouterEnricher.ts`).
- **Agent Chat Service**: Handles the actual execution of tools via AI Foundry (`AgentChatService.ts`).

---

## Key Documentation

For more detailed information, please refer to the following documents:

- [**Architecture & Workflows**](./architecture.md): Detailed breakdown of how tools work, the code structure, and data flow.
- [**Integration & Dependencies**](./integration.md): How tools are integrated into the application and their external dependencies.
- [**Development Guide**](./development.md): Guides on how to extend, modify, or remove tools.

---

## Quick Start for Developers

### Enabling Tools

Tools are primarily triggered by the `SearchMode` selected in the UI:

- **INTELLIGENT**: The `ToolRouterService` decides if a search is needed.
- **ALWAYS**: Forces the `WebSearchTool` to run for every query.
- **NONE**: Disables tool routing.

### Adding a New Tool

To add a new tool:

1. Implement the `Tool` interface in `lib/services/chat/tools/`.
2. Register the tool in `ToolRegistry` (if applicable) or integrate it directly into `ToolRouterEnricher`.
3. Update the `ToolRouterService` system prompt to help the AI decide when to use the new tool.

For more details, see the [Development Guide](./development.md).
