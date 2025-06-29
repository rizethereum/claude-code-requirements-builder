#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SETTINGS = {
    discoveryQuestions: 5,
    expertQuestions: 5
};
// Load settings from file or use defaults
async function loadSettings() {
    const settingsPath = join(process.cwd(), 'requirements', '.mcp-settings.json');
    try {
        const content = await fs.readFile(settingsPath, 'utf-8');
        const parsed = JSON.parse(content);
        return { ...DEFAULT_SETTINGS, ...parsed };
    }
    catch {
        return DEFAULT_SETTINGS;
    }
}
// Save settings to file
async function saveSettings(settings) {
    const requirementsDir = join(process.cwd(), 'requirements');
    await ensureDir(requirementsDir);
    const settingsPath = join(requirementsDir, '.mcp-settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}
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
        // Load settings to determine question counts
        const settings = await loadSettings();
        // Create initial files
        const initialRequestContent = `# Initial Request\n\n**Timestamp:** ${new Date().toISOString()}\n\n**Request:** ${request}\n\n---\n\nThis is the starting point for requirements gathering session: ${folderName}\n`;
        const metadata = {
            id: folderName.split('-').slice(-1)[0],
            started: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            status: "active",
            phase: "discovery",
            progress: {
                discovery: { answered: 0, total: settings.discoveryQuestions },
                detail: { answered: 0, total: settings.expertQuestions }
            },
            contextFiles: [],
            relatedFeatures: [],
            settings: settings
        };
        await fs.writeFile(join(requirementPath, '00-initial-request.md'), initialRequestContent);
        await fs.writeFile(join(requirementPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
        // Set as current requirement
        await setCurrentRequirement(folderName);
        // Generate and save discovery questions
        const discoveryQuestions = generateDiscoveryQuestions(settings.discoveryQuestions);
        const questionsContent = `# Discovery Questions\n\n**Generated:** ${new Date().toISOString()}\n**Total Questions:** ${settings.discoveryQuestions}\n\n` +
            discoveryQuestions.map((q, index) => `## Q${index + 1}: ${q.question}\n**Default if unknown:** ${q.defaultValue ? 'Yes' : 'No'} (${q.reason})\n`).join('\n');
        await fs.writeFile(join(requirementPath, '01-discovery-questions.md'), questionsContent);
        return {
            content: [{
                    type: "text",
                    text: `✅ Requirements gathering started for: "${request}"\n\n📁 Created folder: requirements/${folderName}\n📝 Session is now active\n\n**Settings:**\n- Discovery Questions: ${settings.discoveryQuestions}\n- Expert Questions: ${settings.expertQuestions}\n\n**Next Steps:**\n1. Use 'requirements-status' to continue with discovery questions\n2. The system will guide you through the 5-phase workflow:\n   - Phase 1: Setup & Codebase Analysis ✅\n   - Phase 2: Context Discovery Questions (${settings.discoveryQuestions} questions)\n   - Phase 3: Targeted Context Gathering\n   - Phase 4: Expert Requirements Questions (${settings.expertQuestions} questions)\n   - Phase 5: Requirements Documentation\n\n**Current Phase:** Discovery - Ready to ask ${settings.discoveryQuestions} yes/no questions`
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
    title: "Check Requirements Status and Continue",
    description: "Check the status and progress of the current requirements gathering session and continue the workflow",
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
        // If we're in discovery phase and have unanswered questions, continue asking
        if (metadata.phase === "discovery" && metadata.progress.discovery.answered < metadata.progress.discovery.total) {
            const currentQuestionIndex = metadata.progress.discovery.answered;
            const settings = metadata.settings || await loadSettings();
            const discoveryQuestions = generateDiscoveryQuestions(settings.discoveryQuestions);
            const currentQuestion = discoveryQuestions[currentQuestionIndex];
            // Ask the current question using elicitation
            const answer = await askQuestion(server, `Discovery Question ${currentQuestionIndex + 1}/${metadata.progress.discovery.total}: ${currentQuestion.question}`, currentQuestion.defaultValue, currentQuestion.reason);
            // Update progress
            metadata.progress.discovery.answered++;
            metadata.lastUpdated = new Date().toISOString();
            // Save the answer to the answers file
            const answersPath = join(requirementPath, '02-discovery-answers.md');
            let answersContent = '';
            if (await fileExists(answersPath)) {
                answersContent = await fs.readFile(answersPath, 'utf-8');
            }
            else {
                answersContent = `# Discovery Answers\n\n**Started:** ${new Date().toISOString()}\n\n`;
            }
            answersContent += `## Q${currentQuestionIndex + 1}: ${currentQuestion.question}\n**Answer:** ${answer ? 'Yes' : 'No'}\n**Reasoning:** ${currentQuestion.reason}\n\n`;
            await fs.writeFile(answersPath, answersContent);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            // Check if discovery phase is complete
            if (metadata.progress.discovery.answered >= metadata.progress.discovery.total) {
                metadata.phase = "context";
                await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
                return {
                    content: [{
                            type: "text",
                            text: `✅ **Discovery Phase Complete!**\n\nAnswered: ${answer ? 'Yes' : 'No'} to "${currentQuestion.question}"\n\n🎉 All ${metadata.progress.discovery.total} discovery questions completed!\n\n**Next Phase:** Context Gathering\n- The system will now analyze the codebase based on your answers\n- Use 'requirements-status' again to continue to expert questions`
                        }]
                };
            }
            else {
                return {
                    content: [{
                            type: "text",
                            text: `✅ **Question Answered**\n\nQ${currentQuestionIndex + 1}: ${currentQuestion.question}\n**Answer:** ${answer ? 'Yes' : 'No'}\n\n**Progress:** ${metadata.progress.discovery.answered}/${metadata.progress.discovery.total} discovery questions completed\n\nUse 'requirements-status' again to continue with the next question.`
                        }]
                };
            }
        }
        // If in context phase, move to detail questions
        if (metadata.phase === "context") {
            metadata.phase = "detail";
            metadata.lastUpdated = new Date().toISOString();
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            return {
                content: [{
                        type: "text",
                        text: `📋 **Context Phase Complete**\n\nMoving to Expert Questions phase...\n\n**Next:** ${metadata.progress.detail.total} expert questions about system behavior\n\nUse 'requirements-status' again to start expert questions.`
                    }]
            };
        }
        // If we're in detail phase and have unanswered questions, continue asking
        if (metadata.phase === "detail" && metadata.progress.detail.answered < metadata.progress.detail.total) {
            const currentQuestionIndex = metadata.progress.detail.answered;
            // For now, use basic expert questions - in a full implementation, these would be generated based on context analysis
            const expertQuestions = [
                {
                    question: "Should this feature be accessible to all user roles?",
                    defaultValue: false,
                    reason: "role-based access is more common for new features"
                },
                {
                    question: "Will this feature require database schema changes?",
                    defaultValue: true,
                    reason: "most new features need new data structures"
                },
                {
                    question: "Should this feature have comprehensive error handling and validation?",
                    defaultValue: true,
                    reason: "robust error handling is a best practice"
                },
                {
                    question: "Will this feature need to be backwards compatible with existing APIs?",
                    defaultValue: true,
                    reason: "maintaining API compatibility is usually required"
                },
                {
                    question: "Should this feature include comprehensive logging and monitoring?",
                    defaultValue: true,
                    reason: "observability is critical for production features"
                }
            ].slice(0, metadata.progress.detail.total);
            const currentQuestion = expertQuestions[currentQuestionIndex];
            // Ask the current expert question using elicitation
            const answer = await askQuestion(server, `Expert Question ${currentQuestionIndex + 1}/${metadata.progress.detail.total}: ${currentQuestion.question}`, currentQuestion.defaultValue, currentQuestion.reason);
            // Update progress
            metadata.progress.detail.answered++;
            metadata.lastUpdated = new Date().toISOString();
            // Save the answer to the detail answers file
            const detailAnswersPath = join(requirementPath, '05-detail-answers.md');
            let detailAnswersContent = '';
            if (await fileExists(detailAnswersPath)) {
                detailAnswersContent = await fs.readFile(detailAnswersPath, 'utf-8');
            }
            else {
                detailAnswersContent = `# Expert Question Answers\n\n**Started:** ${new Date().toISOString()}\n\n`;
            }
            detailAnswersContent += `## Q${currentQuestionIndex + 1}: ${currentQuestion.question}\n**Answer:** ${answer ? 'Yes' : 'No'}\n**Reasoning:** ${currentQuestion.reason}\n\n`;
            await fs.writeFile(detailAnswersPath, detailAnswersContent);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            // Check if detail phase is complete
            if (metadata.progress.detail.answered >= metadata.progress.detail.total) {
                metadata.phase = "complete";
                metadata.status = "completed";
                await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
                return {
                    content: [{
                            type: "text",
                            text: `✅ **Expert Questions Complete!**\n\nAnswered: ${answer ? 'Yes' : 'No'} to "${currentQuestion.question}"\n\n🎉 All ${metadata.progress.detail.total} expert questions completed!\n\n**Status:** Requirements gathering complete\n**Next:** Use 'requirements-end' to finalize the session\n\nAll answers have been saved and the requirements specification can now be generated.`
                        }]
                };
            }
            else {
                return {
                    content: [{
                            type: "text",
                            text: `✅ **Expert Question Answered**\n\nQ${currentQuestionIndex + 1}: ${currentQuestion.question}\n**Answer:** ${answer ? 'Yes' : 'No'}\n\n**Progress:** ${metadata.progress.detail.answered}/${metadata.progress.detail.total} expert questions completed\n\nUse 'requirements-status' again to continue with the next question.`
                        }]
                };
            }
        }
        // Show status for completed or other phases
        const phaseDescriptions = {
            discovery: "Context Discovery Questions (understanding problem space)",
            context: "Targeted Context Gathering (autonomous codebase analysis)",
            detail: "Expert Requirements Questions (detailed system behavior)",
            complete: "Requirements Documentation (comprehensive spec generation)"
        };
        let statusText = `📋 **Requirements Session Status**\n\n`;
        statusText += `**Session:** ${currentRequirement}\n`;
        statusText += `**Started:** ${new Date(metadata.started).toLocaleString()}\n`;
        statusText += `**Last Updated:** ${new Date(metadata.lastUpdated).toLocaleString()}\n`;
        statusText += `**Status:** ${metadata.status}\n`;
        statusText += `**Current Phase:** ${metadata.phase} - ${phaseDescriptions[metadata.phase] || 'Unknown'}\n\n`;
        statusText += `**Progress:**\n`;
        if (metadata.progress.discovery) {
            statusText += `- Discovery Questions: ${metadata.progress.discovery.answered}/${metadata.progress.discovery.total} answered\n`;
        }
        if (metadata.progress.detail) {
            statusText += `- Expert Questions: ${metadata.progress.detail.answered}/${metadata.progress.detail.total} answered\n`;
        }
        if (metadata.contextFiles && metadata.contextFiles.length > 0) {
            statusText += `\n**Analyzed Files:** ${metadata.contextFiles.length} files\n`;
        }
        statusText += `\n**Available Actions:**\n`;
        statusText += `- 'requirements-current' - View detailed session info\n`;
        statusText += `- 'requirements-end' - Complete or cancel session\n`;
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
// Tool: requirements-settings
server.registerTool("requirements-settings", {
    title: "Configure Requirements Settings",
    description: "Configure the number of discovery and expert questions",
    inputSchema: {
        action: z.enum(["get", "set"]).describe("Action to perform: get (view current settings) or set (update settings)"),
        discoveryQuestions: z.number().min(1).max(20).optional().describe("Number of discovery questions (1-20)"),
        expertQuestions: z.number().min(1).max(20).optional().describe("Number of expert questions (1-20)")
    }
}, async ({ action, discoveryQuestions, expertQuestions }) => {
    try {
        if (action === "get") {
            const settings = await loadSettings();
            return {
                content: [{
                        type: "text",
                        text: `📋 **Current Settings**\n\n**Discovery Questions:** ${settings.discoveryQuestions}\n**Expert Questions:** ${settings.expertQuestions}\n\nTo change settings, use:\n- requirements-settings with action="set" and new values`
                    }]
            };
        }
        else if (action === "set") {
            const currentSettings = await loadSettings();
            const newSettings = {
                discoveryQuestions: discoveryQuestions ?? currentSettings.discoveryQuestions,
                expertQuestions: expertQuestions ?? currentSettings.expertQuestions
            };
            await saveSettings(newSettings);
            return {
                content: [{
                        type: "text",
                        text: `✅ **Settings Updated**\n\n**Discovery Questions:** ${newSettings.discoveryQuestions}\n**Expert Questions:** ${newSettings.expertQuestions}\n\nSettings saved to requirements/.mcp-settings.json`
                    }]
            };
        }
        return {
            content: [{
                    type: "text",
                    text: "❌ Invalid action specified"
                }],
            isError: true
        };
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: `❌ Error managing settings: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
            isError: true
        };
    }
});
// Helper function to ask a single question using elicitation
async function askQuestion(mcpServer, questionText, defaultValue, defaultReason) {
    const result = await mcpServer.server.elicitInput({
        message: questionText,
        requestedSchema: {
            type: "object",
            properties: {
                answer: {
                    type: "boolean",
                    title: "Answer",
                    description: `Default: ${defaultValue ? 'Yes' : 'No'} (${defaultReason})`,
                    default: defaultValue
                }
            },
            required: ["answer"]
        }
    });
    if (result.action === "accept" && result.content?.answer !== undefined) {
        return result.content.answer;
    }
    // If user cancels or rejects, use default
    return defaultValue;
}
// Helper function to generate discovery questions
function generateDiscoveryQuestions(count) {
    const allQuestions = [
        {
            question: "Will users interact with this feature through a visual interface?",
            defaultValue: true,
            reason: "most features have some UI component"
        },
        {
            question: "Does this feature need to work on mobile devices?",
            defaultValue: true,
            reason: "mobile-first is standard practice"
        },
        {
            question: "Will this feature handle sensitive or private user data?",
            defaultValue: true,
            reason: "better to be secure by default"
        },
        {
            question: "Do users currently have a workaround for this problem?",
            defaultValue: false,
            reason: "assuming this solves a new need"
        },
        {
            question: "Will this feature need to work offline?",
            defaultValue: false,
            reason: "most features require connectivity"
        },
        {
            question: "Will this feature require real-time updates or notifications?",
            defaultValue: false,
            reason: "real-time features add complexity"
        },
        {
            question: "Does this feature need to integrate with external APIs or services?",
            defaultValue: false,
            reason: "internal features are more common"
        },
        {
            question: "Will this feature need to scale to handle many concurrent users?",
            defaultValue: true,
            reason: "better to plan for scale upfront"
        },
        {
            question: "Does this feature require user authentication or authorization?",
            defaultValue: true,
            reason: "most features need some level of access control"
        },
        {
            question: "Will this feature need to maintain audit logs or activity history?",
            defaultValue: false,
            reason: "audit logs are typically for specific use cases"
        }
    ];
    return allQuestions.slice(0, count);
}
// Connect the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
//# sourceMappingURL=index.js.map