# Claude Requirements Gathering System

An intelligent requirements gathering system for Claude Code that progressively builds context through automated discovery, asks simple yes/no questions, and generates comprehensive requirements documentation.

## 🎯 Overview

This system transforms the requirements gathering process by:
- **Codebase-Aware Questions**: AI analyzes your code first, then asks informed questions
- **Simple Yes/No Format**: All questions are yes/no with smart defaults - just say "idk" to use defaults
- **Two-Phase Questioning**: 5 high-level questions for context, then 5 expert questions after code analysis  
- **Automated Documentation**: Generates comprehensive specs with specific file paths and patterns
- **Product Manager Friendly**: No code knowledge required to answer questions

## 🚀 Quick Start

```bash
# Start gathering requirements for a new feature
/requirements-start add user profile picture upload

# Check progress and continue
/requirements-status

# View current requirement details
/requirements-current

# List all requirements
/requirements-list

# End current requirement gathering
/requirements-end

# Quick reminder if AI strays off course
/remind
```

## 📁 Repository Structure

```
claude-requirements/
├── commands/                     # Claude command definitions
│   ├── requirements-start.md    # Begin new requirement
│   ├── requirements-status.md   # Check progress (alias: current)
│   ├── requirements-current.md  # View active requirement
│   ├── requirements-end.md      # Finalize requirement
│   ├── requirements-list.md     # List all requirements
│   └── requirements-remind.md   # Remind AI of rules
│
├── requirements/                 # Requirement documentation storage
│   ├── .current-requirement     # Tracks active requirement
│   ├── index.md                 # Summary of all requirements
│   └── YYYY-MM-DD-HHMM-name/   # Individual requirement folders
│       ├── metadata.json        # Status and progress tracking
│       ├── 00-initial-request.md    # User's original request
│       ├── 01-discovery-questions.md # 5 context questions
│       ├── 02-discovery-answers.md   # User's answers
│       ├── 03-context-findings.md    # AI's code analysis
│       ├── 04-detail-questions.md    # 5 expert questions
│       ├── 05-detail-answers.md      # User's detailed answers
│       └── 06-requirements-spec.md   # Final requirements
│
└── examples/                     # Example requirements
```

## 🔄 How It Works

### Phase 1: Initial Setup & Codebase Analysis
```
User: /requirements-start add export functionality to reports
```
AI analyzes the entire codebase structure to understand the architecture, tech stack, and patterns.

### Phase 2: Context Discovery Questions
The AI asks 5 yes/no questions to understand the problem space:
```
Q1: Will users interact with this feature through a visual interface?
(Default if unknown: YES - most features have UI components)

User: yes

Q2: Does this feature need to work on mobile devices?
(Default if unknown: YES - mobile-first is standard)

User: idk
AI: ✓ Using default: YES

[Continues through all 5 questions before recording answers]
```

### Phase 3: Targeted Context Gathering (Autonomous)
AI autonomously:
- Searches for specific files based on discovery answers
- Reads relevant code sections
- Analyzes similar features in detail
- Documents technical constraints and patterns

### Phase 4: Expert Requirements Questions
With deep context, asks 5 detailed yes/no questions:
```
Q1: Should we use the existing ExportService at services/ExportService.ts?
(Default if unknown: YES - maintains architectural consistency)

User: yes

Q2: Will PDF exports need custom formatting beyond the standard template?
(Default if unknown: NO - standard template covers most use cases)

User: no

[Continues through all 5 questions before recording answers]
```

### Phase 5: Requirements Documentation
Generates comprehensive spec with:
- Problem statement and solution overview
- Functional requirements from all 10 answers
- Technical requirements with specific file paths
- Implementation patterns to follow
- Acceptance criteria

## 📋 Command Reference

### `/requirements-start [description]`
Begins gathering requirements for a new feature or change.

**Example:**
```
/requirements-start implement dark mode toggle
```

### `/requirements-status` or `/requirements-current`
Shows current requirement progress and continues gathering.

**Output:**
```
📋 Active Requirement: dark-mode-toggle
Phase: Discovery Questions
Progress: 3/5 questions answered

Next: Q4: Should this sync across devices?
```

### `/requirements-end`
Finalizes current requirement, even if incomplete.

**Options:**
1. Generate spec with current info
2. Mark incomplete for later
3. Cancel and delete

### `/requirements-list`
Shows all requirements with their status.

**Output:**
```
✅ COMPLETE: dark-mode-toggle (Ready for implementation)
🔴 ACTIVE: user-notifications (Discovery 3/5)
⚠️ INCOMPLETE: data-export (Paused 3 days ago)
```

### `/remind` or `/requirements-remind`
Reminds AI to follow requirements gathering rules.

**Use when AI:**
- Asks open-ended questions
- Starts implementing code
- Asks multiple questions at once

## 🎯 Features

### Smart Defaults
Every question includes an intelligent default based on:
- Best practices
- Codebase patterns
- Context discovered

### Progressive Questioning
- **Phase 1**: Analyzes codebase structure first
- **Phase 2**: 5 high-level questions for product managers
- **Phase 3**: Autonomous deep dive into relevant code
- **Phase 4**: 5 expert questions based on code understanding

### Automatic File Management
- All files created automatically
- Progress tracked between sessions
- Can resume anytime

### Integration Ready
- Links to development sessions
- References PRs and commits
- Searchable requirement history

## 💡 Best Practices

### For Users
1. **Be Specific**: Clear initial descriptions help AI ask better questions
2. **Use Defaults**: "idk" is perfectly fine - defaults are well-reasoned
3. **Stay Focused**: Use `/remind` if AI goes off track
4. **Complete When Ready**: Don't feel obligated to answer every question

### For Requirements
1. **One Feature at a Time**: Keep requirements focused
2. **Think Implementation**: Consider how another AI will use this
3. **Document Decisions**: The "why" is as important as the "what"
4. **Link Everything**: Connect requirements to sessions and PRs

## 🔧 Installation

1. Clone this repository:
```bash
git clone https://github.com/rizethereum/claude-code-requirements-builder.git
```

2. Copy the commands to your project:
```bash
cp -r commands ~/.claude/commands/
# OR for project-specific
cp -r commands /your/project/.claude/commands/
```

3. Create requirements directory:
```bash
mkdir -p requirements
touch requirements/.current-requirement
```

4. Add to `.gitignore` if needed:
```
requirements/
```

## 📚 Examples

### Feature Development
```
/requirements-start add user avatar upload
# AI analyzes codebase structure
# Answer 5 yes/no questions about the feature
# AI autonomously researches relevant code
# Answer 5 expert yes/no questions
# Get comprehensive requirements doc with file paths
```

### Bug Fix Requirements
```
/requirements-start fix dashboard performance issues
# Answer questions about scope
# AI identifies problematic components
# Answer questions about acceptable solutions
# Get targeted fix requirements
```

### UI Enhancement
```
/requirements-start improve mobile navigation experience
# Answer questions about current issues
# AI analyzes existing navigation
# Answer questions about desired behavior
# Get detailed UI requirements
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Add new commands or improve existing ones
4. Submit a pull request

### Ideas for Contribution
- Add requirement templates for common features
- Create requirement validation commands
- Build requirement-to-implementation tracking
- Add multi-language question support

## 📄 License

MIT License - Feel free to use and modify for your projects.

## 🙏 Acknowledgments

Inspired by [@iannuttall](https://github.com/iannuttall)'s [claude-sessions](https://github.com/iannuttall/claude-sessions) project, which pioneered the concept of structured session management for Claude Code.

---

**Remember**: Good requirements today prevent confusion tomorrow!
