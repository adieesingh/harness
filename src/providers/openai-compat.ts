import OpenAI from "openai";
import type { Usage, Provider, StopReason, Message } from "../type";

function toOpenAI(messages:Message[]):OpenAI.ChatCompletionMessageParam[]{
  return messages.map((m):OpenAI.ChatCompletionMessageParam=>{
    if(m.role==="user") return {role:"user",content:m.content}
    if(m.role==="assistant"){
      const text = m.content.filter((b)=>b.type==="text").map((c)=>c.text).join(" ");
      const calls = m.content.filter((b)=>b.type==="toolCall");
      return {
        role:"assistant",
        content: text || null,
        tool_calls: calls.length ? calls.map((c)=>({
          id:c.id,
          type:"function"as const,
          function:{name:c.name,arguments:JSON.stringify(c.arguments)}
        })) : undefined,
      }
    }
    return {role:"tool", tool_call_id:m.toolCallId,content:m.content}
  })

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
    async *stream({ messages, system, model,tools=[] }) {
      const chat = toOpenAI(messages)
      const stream = await client.chat.completions.create({
        model,
        stream: true,
        stream_options: { include_usage: true },
        tools: tools.map((t) => ({
          name: t.name,
           description: t.description,
          parameters: t.parameters ,
        })),
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
