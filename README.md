# Harness

A minimal AI agent harness in TypeScript, built from scratch to understand how coding agents like Claude Code and pi work under the hood.

It gives an LLM two tools (`read` and `bash`), runs the **model → tool call → tool result → model** loop, and streams the answer to your terminal. It ships with a `mypi` CLI.

```bash
$ mypi -p "which tool i can access it"

 groq .. qwen/qwen3.8-27b .. toolUse
 bash
 read
You can access two tools from this project:
1. `read` — reads a text file and returns its content
2. `bash` — runs a bash command in the current folder (returns stdout, stderr, and exit code)
```

## How it works

```
 prompt ──► provider.stream() ──► assistant message
                 ▲                      │
                 │              StopReason == "toolUse"?
                 │                      │ yes
          toolResult messages ◄── execute tool(s)
                                        │ no
                                        ▼
                                  print final answer
```

1. `src/main.ts` parses CLI flags, picks a provider and starts the agent.
2. `src/agent/loop.ts` calls the model, streams text deltas, and if the model stops with `toolUse`, executes each tool call and feeds the results back. It repeats until the model stops, with a safety cap of 20 turns (`maxTurns`).
3. Tool errors are caught and returned to the model as an error result so it can recover.
4. Providers return one normalized message format, so the loop doesn't care which API sits behind it.

## Features

- **Agent loop** with streaming output, tool execution and a max-turn limit
- **Provider abstraction** (`Provider` interface) with Anthropic and OpenAI-compatible backends
- **Tools**
  - `read`: reads a text file relative to the current folder
  - `bash`: runs a command in the current folder with a timeout (default 30s). Output is truncated to the last 2000 lines / 50 KB, and on Windows it prefers Git Bash over the WSL launcher
- **Token usage and stop reason** printed after every turn
- **`mypi` CLI** that can run from any folder, so the agent works on whatever project you are in

## Providers

| `--provider` | Backend | Default model | Env var |
| --- | --- | --- | --- |
| `groq` (default) | Groq, OpenAI-compatible | `qwen/qwen3.8-27b` | `GROQ_API_KEY` |
| `anthropic` | Anthropic SDK | `claude-sonnet-5` | `ANTHROPIC_API_KEY` |
| `antropic-openai` | Anthropic's OpenAI-compatible endpoint | `claude-sonnet-5` | `ANTHROPIC_KEY` |

Override the model with `--model <name>`.

## Getting started

Prerequisites: [Bun](https://bun.sh/docs/installation) (or Node.js 20+) and an API key for at least one provider.

```bash
git clone https://github.com/adieesingh/harness.git
cd harness
bun install
```

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_key
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_KEY=your_anthropic_key   # only for the antropic-openai provider
```

Never commit `.env`. It is already in `.gitignore`.

### Run it

```bash
# directly
bun run dev -- -p "what is written in tsconfig and gitignore"

# or install the CLI globally and use it in any folder
bun link
mypi -p "summarize this project"
mypi -p "list the files here" --provider anthropic
mypi -p "explain src/main.ts" --model qwen/qwen3.8-27b
```

### CLI flags

| Flag | Description | Default |
| --- | --- | --- |
| `-p`, `--prompt` | The task for the agent (required) | none |
| `--provider` | `groq`, `anthropic` or `antropic-openai` | `groq` |
| `--model` | Model name | provider default |

## Project structure

```text
.
├── bin/
│   └── mypi.js            # CLI entry point (registers tsx, loads src/main.ts)
└── src/
    ├── main.ts            # CLI parsing, provider selection, event printing
    ├── type.ts            # Message, Tool, Provider and StreamEvent types
    ├── agent/
    │   └── loop.ts        # The agent loop (runAgent)
    ├── providers/
    │   ├── index.ts       # Provider registry (getProvider)
    │   ├── anthropic.ts   # Anthropic SDK provider
    │   └── openai-compat.ts  # OpenAI-compatible provider (Groq, etc.)
    └── tool/
        ├── index.ts       # Tool registry
        ├── read.ts        # read tool
        └── bash.ts        # bash tool
```

## Adding a tool

A tool is a name, a JSON-schema description and an `execute` function. Create `src/tool/yourtool.ts`:

```ts
import type { Tool } from "../type";

export const yourTool: Tool = {
  name: "your_tool",
  description: "What the model should use this for",
  parameters: {
    type: "object",
    properties: { input: { type: "string" } },
    required: ["input"],
  },
  async execute(args) {
    return `result for ${String(args.input)}`;
  },
};
```

Then add it to the array in `src/tool/index.ts`.

## Adding a provider

Implement the `Provider` interface from `src/type.ts` (`name`, `defaultModel` and a `stream()` async generator that yields `text_delta` events and a final `done` message), then register it in `src/providers/index.ts`.

## Security notes

The `bash` tool runs commands **with your user permissions and no sandbox or confirmation prompt**. Run the harness only in folders and with prompts you trust.

## Roadmap

- Edit and write file tools
- Conversation history and an interactive mode
- Permission prompts before running shell commands
- Configurable `maxTokens` and system prompt

## Credits

Inspired by [pi](https://github.com/badlogic/pi-mono) and Claude Code.
