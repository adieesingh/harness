import type { Provider } from "../type";
import { createAnthropic } from "./anthropic";
import { createOpenAi } from "./openai-compat";
import dotenv from "dotenv";
dotenv.config();

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
      process.env.GROQ_API_KEY!,
      "qwen/qwen3.8-27b",
    ),
  gemini:()=>
    createOpenAi(
      "gemini",
      "https://generativelanguage.googleapis.com/v1beta/openai/",
      process.env.GEMINI_API_KEY!,
      "gemini-3.8-flash"
    )
  
};

export function getProvider(name: string): Provider {
  const create = provider[name];
  if (!create) {
    throw new Error("Something went wrong in index.ts");
  }
  return create();
}
