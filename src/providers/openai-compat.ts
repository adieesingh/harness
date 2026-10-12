import OpenAI from "openai";
import type { Usage, Provider, StopReason } from "../type";
export function createOpenAi(
  name: string,
  baseURL: string,
  apiKey: string,
  defaultModel: string,
): Provider {
  const client = new OpenAI({ baseURL, apiKey });
  return {
    defaultModel,
    name,
    async *stream({ messages, system, model }) {
      const chat: OpenAI.ChatCompletionAssistantMessageParam[] = messages.map(
        (r: any) => ({ role: r.role, content: r.content }),
      );
      const stream = await client.chat.completions.create({
        model,
        stream: true,
        stream_options: { include_usage: true },
        messages: system
          ? [{ role: "system", content: system }, ...chat]
          : chat,
      });
      let text = "";
      let usage: Usage = { input: 0, output: 0 };
      let StopReason: StopReason = "stop";
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (choice?.delta.content) {
          text += choice.delta.content;
          yield { type: "text_delta", delta: choice.delta.content };
        }
        if (choice?.finish_reason === "length") StopReason = "length";
        if (chunk.usage)
          usage = {
            input: chunk.usage.prompt_tokens,
            output: chunk.usage.completion_tokens,
          };
      }
      yield {
        type: "done",
        message: { role: "assistant", content: text, StopReason, usage },
      };
    },
  };
}
