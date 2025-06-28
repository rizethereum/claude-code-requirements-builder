#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
// Create the MCP server
const server = new McpServer({
    name: "claude-code-requirements",
    version: "1.0.0"
});
// Helper functions for file operations
async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    }
    catch (error) {
        // Directory might already exist
    }
}
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function readFileIfExists(filePath) {
    try {
        return await fs.readFile(filePath, 'utf-8');
    }
    catch {
        return null;
    }
}
async function getCurrentRequirement() {
    const currentFile = join(process.cwd(), 'requirements', '.current-requirement');
    return await readFileIfExists(currentFile);
}
async function setCurrentRequirement(folderName) {
    const requirementsDir = join(process.cwd(), 'requirements');
    await ensureDir(requirementsDir);
    const currentFile = join(requirementsDir, '.current-requirement');
    await fs.writeFile(currentFile, folderName);
}
async function clearCurrentRequirement() {
    const currentFile = join(process.cwd(), 'requirements', '.current-requirement');
    try {
        await fs.unlink(currentFile);
    }
    catch {
        // File might not exist
    }
}
function createTimestampFolder(name) {
    const now = new Date();
    const timestamp = now.toISOString()
        .slice(0, 16)
        .replace('T', '-')
        .replace(':', '');
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 30);
    return `${timestamp}-${slug}`;
}
// Tool: requirements-start
server.registerTool("requirements-start", {
    title: "Start Requirements Gathering",
    description: "Begin gathering requirements for a new feature or project",
    inputSchema: {
        request: z.string().describe("The feature or project request to gather requirements for")
    }
}, async ({ request }) => {
    try {
        // Check if there's already an active requirement
        const currentRequirement = await getCurrentRequirement();
        if (currentRequirement) {
            return {
                content: [{
                        type: "text",
                        text: `❌ There is already an active requirement session: ${currentRequirement}\n\nPlease complete it first with 'requirements-end' or check its status with 'requirements-status'.`
                    }]
            };
        }
        // Create timestamped folder
        const folderName = createTimestampFolder(request);
        const requirementPath = join(process.cwd(), 'requirements', folderName);
        await ensureDir(requirementPath);
        // Create initial files
        const initialRequestContent = `# Initial Request\n\n**Timestamp:** ${new Date().toISOString()}\n\n**Request:** ${request}\n\n---\n\nThis is the starting point for requirements gathering session: ${folderName}\n`;
        const metadata = {
            id: folderName.split('-').slice(-1)[0],
            started: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            status: "active",
            phase: "discovery",
            progress: {
                discovery: { answered: 0, total: 5 },
                detail: { answered: 0, total: 0 }
            },
            contextFiles: [],
            relatedFeatures: []
        };
        await fs.writeFile(join(requirementPath, '00-initial-request.md'), initialRequestContent);
        await fs.writeFile(join(requirementPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
        // Set as current requirement
        await setCurrentRequirement(folderName);
        return {
            content: [{
                    type: "text",
                    text: `✅ Requirements gathering started for: "${request}"\n\n📁 Created folder: requirements/${folderName}\n📝 Session is now active\n\n**Next Steps:**\n1. Use 'requirements-status' to see progress\n2. The system will guide you through the 5-phase workflow:\n   - Phase 1: Setup & Codebase Analysis\n   - Phase 2: Context Discovery Questions  \n   - Phase 3: Targeted Context Gathering\n   - Phase 4: Expert Requirements Questions\n   - Phase 5: Requirements Documentation\n\n**Current Phase:** Discovery (5 yes/no questions about problem space)`
                }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: `❌ Error starting requirements gathering: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
            isError: true
        };
    }
});
// Tool: requirements-status  
server.registerTool("requirements-status", {
    title: "Check Requirements Status",
    description: "Check the status and progress of the current requirements gathering session",
    inputSchema: {}
}, async () => {
    try {
        const currentRequirement = await getCurrentRequirement();
        if (!currentRequirement) {
            return {
                content: [{
                        type: "text",
                        text: `📋 **No Active Requirements Session**\n\nTo start a new requirements gathering session:\n- Use 'requirements-start' with your feature request\n\nTo view previous sessions:\n- Use 'requirements-list' to see all requirements`
                    }]
            };
        }
        const requirementPath = join(process.cwd(), 'requirements', currentRequirement);
        const metadataPath = join(requirementPath, 'metadata.json');
        if (!await fileExists(metadataPath)) {
            return {
                content: [{
                        type: "text",
                        text: `❌ Metadata file not found for active session: ${currentRequirement}`
                    }],
                isError: true
            };
        }
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        const phaseDescriptions = {
            discovery: "Context Discovery Questions (understanding problem space)",
            context: "Targeted Context Gathering (autonomous codebase analysis)",
            detail: "Expert Requirements Questions (detailed system behavior)",
            complete: "Requirements Documentation (comprehensive spec generation)"
        };
        let statusText = `📋 **Active Requirements Session**\n\n`;
        statusText += `**Session:** ${currentRequirement}\n`;
        statusText += `**Started:** ${new Date(metadata.started).toLocaleString()}\n`;
        statusText += `**Last Updated:** ${new Date(metadata.lastUpdated).toLocaleString()}\n`;
        statusText += `**Status:** ${metadata.status}\n`;
        statusText += `**Current Phase:** ${metadata.phase} - ${phaseDescriptions[metadata.phase] || 'Unknown'}\n\n`;
        statusText += `**Progress:**\n`;
        if (metadata.progress.discovery) {
            statusText += `- Discovery Questions: ${metadata.progress.discovery.answered}/${metadata.progress.discovery.total} answered\n`;
        }
        if (metadata.progress.detail && metadata.progress.detail.total > 0) {
            statusText += `- Detail Questions: ${metadata.progress.detail.answered}/${metadata.progress.detail.total} answered\n`;
        }
        if (metadata.contextFiles && metadata.contextFiles.length > 0) {
            statusText += `\n**Analyzed Files:** ${metadata.contextFiles.length} files\n`;
        }
        statusText += `\n**Available Actions:**\n`;
        statusText += `- 'requirements-current' - View detailed session info\n`;
        statusText += `- 'requirements-end' - Complete or cancel session\n`;
        statusText += `- 'requirements-remind' - Get workflow guidance\n`;
        return {
            content: [{
                    type: "text",
                    text: statusText
                }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: `❌ Error checking requirements status: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
            isError: true
        };
    }
});
// Tool: requirements-current
server.registerTool("requirements-current", {
    title: "View Current Requirements Details",
    description: "View detailed information about the current requirements gathering session",
    inputSchema: {}
}, async () => {
    try {
        const currentRequirement = await getCurrentRequirement();
        if (!currentRequirement) {
            return {
                content: [{
                        type: "text",
                        text: `📋 No active requirements session. Use 'requirements-start' to begin.`
                    }]
            };
        }
        const requirementPath = join(process.cwd(), 'requirements', currentRequirement);
        // Read all relevant files
        const files = await fs.readdir(requirementPath);
        const mdFiles = files.filter(f => f.endsWith('.md')).sort();
        let content = `📋 **Current Requirements Session: ${currentRequirement}**\n\n`;
        // Show each file content
        for (const file of mdFiles) {
            const filePath = join(requirementPath, file);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            content += `## ${file}\n\n`;
            content += `${fileContent}\n\n---\n\n`;
        }
        // Show metadata
        const metadataPath = join(requirementPath, 'metadata.json');
        if (await fileExists(metadataPath)) {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            content += `## Metadata\n\n`;
            content += `\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\`\n`;
        }
        return {
            content: [{
                    type: "text",
                    text: content
                }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: `❌ Error viewing current requirements: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
            isError: true
        };
    }
});
// Tool: requirements-end
server.registerTool("requirements-end", {
    title: "End Requirements Session",
    description: "Complete, mark as incomplete, or delete the current requirements gathering session",
    inputSchema: {
        action: z.enum(["complete", "incomplete", "delete"]).describe("Action to take: complete (mark as finished), incomplete (save but mark unfinished), delete (remove entirely)")
    }
}, async ({ action }) => {
    try {
        const currentRequirement = await getCurrentRequirement();
        if (!currentRequirement) {
            return {
                content: [{
                        type: "text",
                        text: `❌ No active requirements session to end.`
                    }]
            };
        }
        const requirementPath = join(process.cwd(), 'requirements', currentRequirement);
        const metadataPath = join(requirementPath, 'metadata.json');
        if (action === "delete") {
            // Delete the entire requirement folder
            await fs.rm(requirementPath, { recursive: true, force: true });
            await clearCurrentRequirement();
            return {
                content: [{
                        type: "text",
                        text: `🗑️ **Requirements session deleted**\n\nDeleted: ${currentRequirement}\nNo active session remaining.`
                    }]
            };
        }
        // Update metadata for complete/incomplete
        if (await fileExists(metadataPath)) {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            metadata.status = action === "complete" ? "completed" : "incomplete";
            metadata.lastUpdated = new Date().toISOString();
            metadata.endedAt = new Date().toISOString();
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        }
        // Update requirements index
        const indexPath = join(process.cwd(), 'requirements', 'index.md');
        const indexExists = await fileExists(indexPath);
        let indexContent = indexExists ? await fs.readFile(indexPath, 'utf-8') :
            `# Requirements Index\n\nThis file tracks all requirements gathering sessions.\n\n`;
        const statusEmoji = action === "complete" ? "✅" : "⚠️";
        const statusText = action === "complete" ? "Completed" : "Incomplete";
        const newEntry = `- ${statusEmoji} **${currentRequirement}** - ${statusText} (${new Date().toLocaleDateString()})\n`;
        if (!indexContent.includes(currentRequirement)) {
            indexContent += newEntry;
            await fs.writeFile(indexPath, indexContent);
        }
        await clearCurrentRequirement();
        return {
            content: [{
                    type: "text",
                    text: `${statusEmoji} **Requirements session ${action === "complete" ? "completed" : "marked incomplete"}**\n\nSession: ${currentRequirement}\nStatus: ${statusText}\nNo active session remaining.\n\nUse 'requirements-list' to view all sessions.`
                }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: `❌ Error ending requirements session: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
            isError: true
        };
    }
});
// Tool: requirements-list
server.registerTool("requirements-list", {
    title: "List All Requirements",
    description: "List all requirements gathering sessions (active and completed)",
    inputSchema: {}
}, async () => {
    try {
        const requirementsDir = join(process.cwd(), 'requirements');
        if (!await fileExists(requirementsDir)) {
            return {
                content: [{
                        type: "text",
                        text: `📋 **No Requirements Sessions Found**\n\nThe requirements/ directory doesn't exist yet.\nUse 'requirements-start' to create your first session.`
                    }]
            };
        }
        const entries = await fs.readdir(requirementsDir, { withFileTypes: true });
        const folders = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
        if (folders.length === 0) {
            return {
                content: [{
                        type: "text",
                        text: `📋 **No Requirements Sessions Found**\n\nUse 'requirements-start' to create your first session.`
                    }]
            };
        }
        const currentRequirement = await getCurrentRequirement();
        let content = `📋 **All Requirements Sessions**\n\n`;
        // Sort folders by timestamp (newest first)
        const sortedFolders = folders.sort().reverse();
        for (const folder of sortedFolders) {
            const folderPath = join(requirementsDir, folder);
            const metadataPath = join(folderPath, 'metadata.json');
            let status = "Unknown";
            let phase = "Unknown";
            let started = "Unknown";
            if (await fileExists(metadataPath)) {
                try {
                    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                    const metadata = JSON.parse(metadataContent);
                    status = metadata.status || "Unknown";
                    phase = metadata.phase || "Unknown";
                    started = metadata.started ? new Date(metadata.started).toLocaleDateString() : "Unknown";
                }
                catch {
                    // Ignore metadata read errors
                }
            }
            const isActive = folder === currentRequirement;
            const activeIndicator = isActive ? " 🟢 **ACTIVE**" : "";
            const statusEmoji = status === "completed" ? "✅" : status === "incomplete" ? "⚠️" : status === "active" ? "🟡" : "❓";
            content += `${statusEmoji} **${folder}**${activeIndicator}\n`;
            content += `   Status: ${status} | Phase: ${phase} | Started: ${started}\n\n`;
        }
        content += `**Actions:**\n`;
        content += `- 'requirements-start' - Start new session\n`;
        if (currentRequirement) {
            content += `- 'requirements-status' - Check active session\n`;
            content += `- 'requirements-current' - View active session details\n`;
        }
        return {
            content: [{
                    type: "text",
                    text: content
                }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: `❌ Error listing requirements: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
            isError: true
        };
    }
});
// Tool: requirements-remind
server.registerTool("requirements-remind", {
    title: "Workflow Reminder",
    description: "Get a reminder of the requirements gathering workflow rules and best practices",
    inputSchema: {}
}, async () => {
    const reminderContent = `📚 **Requirements Gathering Workflow Reminder**

## 5-Phase Workflow:

### Phase 1: Initial Setup & Codebase Analysis
- Create timestamp-based folder
- Extract slug from request  
- Create initial files (00-initial-request.md, metadata.json)
- Set as current requirement
- Analyze overall codebase structure

### Phase 2: Context Discovery Questions
- Generate 5 most important yes/no questions about problem space
- Questions about user interactions, workflows, similar features
- Questions about data/content, integrations, performance
- Write ALL questions to 01-discovery-questions.md with smart defaults
- Ask questions ONE AT A TIME
- Record answers in 02-discovery-answers.md

### Phase 3: Targeted Context Gathering (Autonomous)
- Search for specific files based on discovery answers
- Deep dive into similar features and patterns
- Analyze implementation details
- Document findings in 03-context-findings.md with:
  - Specific files that need modification
  - Exact patterns to follow
  - Technical constraints and considerations

### Phase 4: Expert Requirements Questions  
- Ask 5 detailed yes/no questions like a senior developer
- Questions about expected system behavior using codebase knowledge
- Include smart defaults based on codebase patterns
- Write to 04-detail-questions.md, ask one at a time
- Record answers in 05-detail-answers.md

### Phase 5: Requirements Documentation
- Generate comprehensive spec in 06-requirements-spec.md:
  - Problem statement and solution overview
  - Functional requirements based on all answers
  - Technical requirements with specific file paths
  - Implementation hints and patterns
  - Acceptance criteria
  - Assumptions for unanswered questions

## Key Rules:
- **ONLY yes/no questions** with smart defaults
- **ONE question at a time** (never batch)
- **Write ALL questions to file BEFORE asking any**
- Use actual file paths and component names in detail phase
- Document WHY each default makes sense
- Stay focused on requirements (no implementation)

## Current Status:
Use 'requirements-status' to see your current phase and progress.`;
    return {
        content: [{
                type: "text",
                text: reminderContent
            }]
    };
});
// Connect the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
//# sourceMappingURL=index.js.map