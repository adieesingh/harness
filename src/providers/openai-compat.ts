import OpenAI from "openai";
import type {
  ContentBlock,
  Usage,
  Provider,
  StopReason,
  Message,
} from "../type";

function toOpenAI(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((m): OpenAI.ChatCompletionMessageParam => {
    if (m.role === "user") return { role: "user", content: m.content };
    if (m.role === "assistant") {
      const text = m.content
        .filter((b) => b.type === "text")
        .map((c) => c.text)
        .join(" ");
      const calls = m.content.filter((b) => b.type === "toolCall");
      return {
        role: "assistant",
        content: text || null,
        tool_calls: calls.length
          ? calls.map((c):OpenAI.Chat.ChatCompletionMessageToolCall => {
              const toolCallObj: any = {
                id: c.id,
                type: "function" as const,
                function: {
                  name: c.name,
                  arguments: JSON.stringify(c.arguments),
                },
              };
              if(c.thought_signature){
                toolCallObj.thought_signature=c.thought_signature 
              }
              return toolCallObj
            })
          : undefined,
      };
    }

    return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
  });
}

export function createOpenAi(
  name: string,
  baseURL: string,
  apiKey: string | undefined,
  defaultModel: string,
): Provider {
  const client = new OpenAI({ baseURL, apiKey });
  return {
    defaultModel,
    name,
    async *stream({ messages, system, model, tools = [] }) {
      const chat = toOpenAI(messages);
      const stream = await client.chat.completions.create({
        model,
        stream: true,
        stream_options: { include_usage: true },
        tools: tools.length
          ? tools.map((t) => ({
              type: "function" as const,
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,

              },
            }
          ))
          : undefined,
        messages: system
          ? [{ role: "system", content: system }, ...chat]
          : chat,
      });

      let text = "";
      const calls: { id: string; name: string; args: string,thought_signature?:string }[] = [];
      let usage: Usage = { input: 0, output: 0 };
      let StopReason: StopReason = "stop";

   
      for await (const chunk of stream) {
        const choice = chunk.choices[0];

        if (choice?.delta.content) {
          text += choice.delta.content;
          yield { type: "text_delta", delta: choice.delta.content };
        }

        for (const tc of choice?.delta.tool_calls ?? []) {
          const idx = tc.index ?? 0;
          calls[idx] ??= {
            id: tc.id ?? `call_${idx}`,
            name: tc.function?.name ?? "",
            args: "",
            thought_signature:(tc as any).thought_signature || undefined,
          };
          if (tc.function?.name) {
            calls[idx].name = tc.function.name;
          }
          if((tc as any).thought_signature ){
            calls[idx].thought_signature=(tc as any).thought_signature;
          }
          if (tc.id) {
            calls[idx].id = tc.id;
          }
          calls[idx].args += tc.function?.arguments ?? "";
        }

        if (choice?.finish_reason === "tool_calls") {
          StopReason = "toolUse";
        } else if (choice?.finish_reason === "length") {
          StopReason = "length";
        }

        if (chunk.usage) {
          usage = {
            input: chunk.usage.prompt_tokens,
            output: chunk.usage.completion_tokens,
          };
        }
      }

      const content: ContentBlock[] = [];
      if (text) {
        content.push({ type: "text", text });
      }

      for (const t of calls) {
        if (t) {
          let parsedArgs = {};
          try {
            parsedArgs = t.args ? JSON.parse(t.args) : {};
          } catch (e) {
            parsedArgs = {};
          }
          content.push({
            type: "toolCall",
            id: t.id,
            name: t.name,
            arguments: parsedArgs,
          });
        }
      }

      if (content.some((b) => b.type === "toolCall")) {
        StopReason = "toolUse";
      }

      yield {
        type: "done",
        message: { role: "assistant", content, StopReason, usage },
      };
    },
  };
}
