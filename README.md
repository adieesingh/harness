# Harness

A TypeScript-based AI API project built with [Bun](https://bun.sh/), with integrations for Anthropic and OpenAI. The repository also includes a `mypi` command-line entry point.

## Tech Stack

- **Bun** — JavaScript runtime, package manager, and toolkit
- **TypeScript** — typed application development
- **Anthropic SDK** — integration with Anthropic models
- **OpenAI SDK** — integration with OpenAI models
- **tsx** — run TypeScript entry points during development
- **dotenv** — load local environment variables

## Prerequisites

- [Bun](https://bun.sh/docs/installation) installed
- API key for the AI provider you intend to use

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/adieesingh/harness.git
cd harness
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Create a `.env` file in the project root and add the API key(s) required by your implementation:

```env
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Keep your real API keys private. Do not commit `.env` or hard-code credentials in source files.

### 4. Run the development entry point

The `dev` script is configured to run `src/main.ts`:

```bash
bun run dev
```

If you want to run a different entry point, use the path that exists in your local checkout, for example:

```bash
bun run path/to/file.ts
```

## Project Scripts

| Command | Description |
| --- | --- |
| `bun install` | Install project dependencies |
| `bun run dev` | Run the development entry point at `src/main.ts` |

## Project Structure

```text
.
├── src/
│   └── main.ts       # Development entry point (as configured in package.json)
├── bin/
│   └── mypi.js       # CLI entry point (as configured in package.json)
├── package.json
├── tsconfig.json
└── README.md
```

The structure above highlights paths referenced by the project configuration. Add or adjust files as your implementation evolves.

## Security Notes

- Store provider API keys in environment variables.
- Never push secrets, access tokens, or private configuration to Git.
- Use only the provider SDK and model configuration needed by your application.

## Useful Links

- [Bun documentation](https://bun.sh/docs)
- [Anthropic API documentation](https://docs.anthropic.com/)
- [OpenAI API documentation](https://platform.openai.com/docs)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
