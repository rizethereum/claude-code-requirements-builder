# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Claude Requirements Gathering System - a structured workflow for collecting and documenting software requirements through AI-guided interviews. The system provides both slash commands and an MCP server implementation, using a two-phase questioning approach (discovery + expert) with automated context gathering to generate comprehensive requirements documentation.

## Repository Structure

```
claude-code-requirements-builder/
├── src/                           # MCP server source code
│   └── index.ts                   # Main MCP server implementation
├── dist/                          # Built JavaScript files
├── commands/                      # Claude slash command definitions
│   ├── requirements-start.md     # Begin new requirement gathering
│   ├── requirements-status.md    # Check progress (alias: current)  
│   ├── requirements-current.md   # View active requirement details
│   ├── requirements-end.md       # Finalize requirement session
│   ├── requirements-list.md      # List all requirements
│   └── requirements-remind.md    # Remind AI of workflow rules
├── requirements/                  # Generated requirement documents
│   ├── .current-requirement      # Tracks active requirement
│   ├── index.md                  # Summary of all requirements
│   └── YYYY-MM-DD-HHMM-[name]/  # Individual requirement folders
├── examples/                     # Sample requirement outputs
├── package.json                  # npm package configuration
└── tsconfig.json                 # TypeScript configuration
```

## Dual Implementation Architecture

This system provides two ways to access the same functionality:

### MCP Server (`src/index.ts`)
- **Node.js TypeScript implementation** using the official MCP SDK
- **6 registered tools** that mirror the slash commands:
  - `requirements-start` - Begin new requirement gathering
  - `requirements-status` - Check progress and session state
  - `requirements-current` - View active requirement details  
  - `requirements-end` - Complete/incomplete/delete session
  - `requirements-list` - Multi-requirement overview with status
  - `requirements-remind` - Workflow rules and best practices reminder
- **File-based state management** using the same structure as slash commands
- **npx distribution** for easy installation and updates

### Slash Commands (`commands/` directory)
Each command in `commands/` defines a specific workflow step:

- **requirements-start.md**: 5-phase workflow (setup → discovery → context → expert → documentation)
- **requirements-status.md**: Progress tracking and session resumption
- **requirements-end.md**: Finalization with options (complete/incomplete/delete)
- **requirements-list.md**: Multi-requirement overview with status display

## Key Workflow Patterns

### Phase-Based Progression
1. **Setup**: Create timestamped folder, extract slug from request
2. **Discovery**: 5 yes/no questions about problem space
3. **Context**: Autonomous code analysis and file reading
4. **Expert**: 5 detailed yes/no questions with codebase knowledge
5. **Documentation**: Generate comprehensive requirements spec

### Question Format Standards
- Only yes/no questions with intelligent defaults
- One question at a time (never batch)
- Write ALL questions to file BEFORE asking any
- Include "Default if unknown" reasoning for each question
- Use actual file paths and component names in expert phase

### File Naming Conventions
- Requirement folders: `YYYY-MM-DD-HHMM-[feature-slug]`
- Sequential files: `00-initial-request.md` through `06-requirements-spec.md`
- Metadata tracking: `metadata.json` with phase/progress state

### State Management
- `.current-requirement` file tracks active session
- `metadata.json` structure includes phase, progress counters, analyzed files
- Status transitions: discovery → context → detail → complete

## Development Notes

This repository provides dual implementation approaches:

### MCP Server Development
- **TypeScript** with Node.js runtime
- **MCP SDK** for protocol compliance
- **Build system** with `npm run build` 
- **npx distribution** for easy installation
- **State management** via JSON metadata files

### Slash Commands
- **Documentation-based** system reading markdown files in `commands/`
- **No build system** required for slash commands
- **File-based workflow** definitions

## Usage Patterns

The system is designed for product managers and developers to gather requirements through:
- Simple yes/no responses (supports "idk" for defaults)
- Codebase-aware questioning after AI analysis
- Progressive refinement from high-level to implementation-specific
- Comprehensive documentation with file paths and implementation hints

### MCP Server Usage
Users can install via `npx claude-code-requirements` and access all functionality through MCP tools in Claude Desktop or other MCP-compatible clients.

### Slash Command Usage  
For users preferring the original slash command interface, the `commands/` directory provides the same workflow through Claude Code's built-in command system.

When working with this repository, maintain consistency between both implementations and ensure the workflow preserves its structured, phase-based approach while keeping questions simple and defaults intelligent.