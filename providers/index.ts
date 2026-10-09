import type { Provider } from "../src/type";
import { createAnthropic } from "./anthropic";
import { createOpenAi } from "./openai-compat";

const provider: Record<string, () => Provider> = {
  anthropic: createAnthropic,
  "antropic-openai": () =>
    createOpenAi(
      "anthropic-openai",
      "https://api.anthropic.com/v1",
      process.env.ANTHROPIC_KEY!,
      "claude-sonnet-5",
    ),
  groq: () =>
    createOpenAi(
      "groq",
      "https://api.groq.com/openai/v1",
      process.env.GROQ_KEY!,
      "qwen/qwen",
    ),
};

export function getProvider(name: string): Provider {
  const create = provider[name];
  if (!create) {
    throw new Error("Something went wrong in index.ts");
  }
  return create();
}
