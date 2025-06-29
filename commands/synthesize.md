# Synthesize Requirements into Implementation

Analyzes completed requirements and generates a detailed implementation plan with tracked todo steps

aliases: synth, implement

## Instructions

When the user runs the `synthesize` command:

1. **Enter Planning Mode**
   - Activate Claude's planning mode to ensure thoughtful analysis
   - Prepare for comprehensive requirements review and implementation planning

2. **Find Most Recent Completed Requirements**
   - Navigate to `requirements/` directory in the current working directory
   - Look for subdirectories with timestamp format (YYYY-MM-DD_HH-MM-SS_*)
   - Find the most recent directory containing a `metadata.json` with `"status": "complete"`
   - Extract the requirement name from the directory (part after timestamp)

3. **Load and Analyze Requirements**
   - Read `06-requirements-spec.md` from the identified directory
   - Parse the following sections:
     - Problem Statement
     - Solution Overview
     - Functional Requirements (FR*)
     - Technical Requirements (TR*)
     - Implementation Hints
     - Acceptance Criteria
   - Read `03-context-findings.md` for technical context
   - Read `metadata.json` for related features and context files

4. **Generate Implementation Plan**
   Create a detailed implementation plan with the following structure:
   ```markdown
   # Implementation Plan: [Requirement Name]
   Generated: [Current Timestamp]
   Based on: [Original Requirements Timestamp]

   ## Overview
   [Brief summary of what will be implemented]

   ## Prerequisites
   - [ ] List any setup requirements
   - [ ] Dependencies to install
   - [ ] Files to create/modify

   ## Implementation Phases

   ### Phase 1: [Foundation/Setup]
   **Objective**: [What this phase accomplishes]
   **Requirements Addressed**: [FR/TR numbers]
   
   Steps:
   1. [Specific action with file:line references]
   2. [Next action]
   ...

   ### Phase 2: [Core Implementation]
   [Continue pattern for each logical phase]

   ## Testing Strategy
   - Unit tests for [components]
   - Integration tests for [features]
   - Manual testing checklist

   ## Validation Against Acceptance Criteria
   [Map each acceptance criterion to implementation steps]
   ```

5. **Generate Todo List**
   Create a structured todo list from the implementation plan:
   ```markdown
   # Implementation Todo: [Requirement Name]
   Generated: [Current Timestamp]
   Total Steps: [Number]

   ## Setup Tasks
   - [ ] SETUP-1: [Task description] | File: [path] | Priority: High
   - [ ] SETUP-2: [Task description] | File: [path] | Priority: High

   ## Phase 1 Tasks
   - [ ] P1-1: [Task description] | File: [path] | Priority: High
   - [ ] P1-2: [Task description] | File: [path] | Priority: Medium
   
   ## Phase 2 Tasks
   [Continue pattern]

   ## Testing Tasks
   - [ ] TEST-1: [Test description] | Type: [unit/integration/manual]
   
   ## Validation Tasks
   - [ ] VAL-1: Verify [acceptance criterion]
   ```

6. **Save Plan and Todo List**
   - Create subdirectory: `[requirements-dir]/implementation/`
   - Save files with timestamps:
     - `implementation-plan_[timestamp].md`
     - `implementation-todo_[timestamp].md`
   - Create a `current` symlink to latest files for easy access

7. **Begin Implementation**
   - Exit planning mode with the generated plan
   - Load the todo list into Claude's TodoWrite tool
   - Start with SETUP tasks, marking each as `in_progress` then `completed`
   - Follow any project-specific guidance from CLAUDE.md if present
   - For each task:
     1. Mark as `in_progress` in TodoWrite
     2. Implement the specific change
     3. Run any relevant tests/lints
     4. Mark as `completed` in TodoWrite
     5. Update the saved todo file with completion status

8. **Progress Tracking**
   - Periodically save progress to `implementation-todo_[timestamp].md`
   - Add completion timestamps to finished items
   - If blocked on any task, add a `BLOCKED:` prefix and explanation
   - Create `implementation-notes_[timestamp].md` for any discoveries or changes

## Error Handling

- If no completed requirements found: "No completed requirements found in requirements/"
- If requirements incomplete: "Found requirement [name] but status is [status], not 'complete'"
- If missing required files: List which files are missing from the requirement

## Example Usage

```
synthesize
```

This will:
1. Find the most recent completed requirement in `requirements/`
2. Generate a detailed implementation plan
3. Create a todo list with specific tasks
4. Save both in the requirements directory
5. Begin implementing while tracking progress

## Notes

- The command respects any coding standards in the project's CLAUDE.md file
- Each task in the todo list maps to specific requirement items (FR/TR)
- Progress is saved incrementally to prevent loss of work
- The implementation follows the phases defined in the plan
- Testing and validation are integrated into the workflow