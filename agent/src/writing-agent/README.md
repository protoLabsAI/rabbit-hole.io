# Writing Agent

AI-powered writing assistant using LangGraph coordinator pattern with CopilotKit integration.

## Architecture

**Coordinator Pattern:**

```
Writing Coordinator
  ↓ delegates via task tool
┌──────────────────────┐
│ Media Processing     │
│ Subagent             │
│                      │
│ Handles:             │
│ - YouTube videos     │
│ - Audio transcription│
│ - Summarization      │
└──────────────────────┘

Coordinator keeps:
- Frontend tools (insert_text, etc.) - sync operations
- File I/O (read_file, write_file, ls)
- Todo management (write_todos)
- Delegation (task)
```

## Features

### Media Processing

- YouTube video download and processing
- Audio transcription (Groq/OpenAI/Local)
- Automatic summarization
- Progress tracking with UI

### Document Editing

- Direct frontend tool integration
- Real-time document modifications
- Multi-tab support with permissions

### State Management

- File-based communication between subagents
- Todo tracking for multi-step workflows
- CopilotKit streaming for real-time updates

## Usage

Connected via `/api/copilotkit` with agent name `writing_agent`

**Example requests:**

- "Process this YouTube video: [url]" → Delegates to media-processing subagent
- "Improve this paragraph" → Uses frontend tools directly
- "Summarize the current document" → Quick edit, no delegation

## Files

- `state.ts` - WritingAgentStateAnnotation with files and todos
- `graph/nodes.ts` - coordinatorNode implementation
- `tools/` - File I/O, task delegation, and built-in tools
- Graph builder in `packages/proto-llm-tools/src/tools/writing-agent-tools/graph/`

## Subagents

### Media Processing

**Location:** `packages/proto-llm-tools/src/tools/writing-agent-tools/subagents/media-processing.ts`

**Workflow:**

1. Enqueue YouTube job
2. Wait for completion with progress UI
3. Transcribe audio using Groq (FREE - 10,000 min/day)
4. Generate summary
5. Write results to /workspace/\*.json
6. Return to coordinator

**Tools:**

- `enqueue_youtube_job`
- `wait_for_job` (with interrupt for progress UI)
- `transcribe_audio`
- `summarize`
- `submit_output`

## Frontend Integration

**Components:**

- `JobProgressInterrupt` - Handles job progress interrupts
- `TodoPanel` - Shows agent task progress

**State Access:**

- Uses `useCoAgent` for state synchronization
- Todos stream to frontend in real-time
