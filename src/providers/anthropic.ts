
import Anthropic from "@anthropic-ai/sdk";
import type { StopReason, Provider, StreamOptions, Message } from "../type";

function toAnthropic(message: Message[]): Anthropic.MessageParam[] {
  return message.map((m): Anthropic.MessageParam => {
    if (m.role == "user") return { role: m.role, content: m.content };
    if (m.role == "assistant") {
      return {
        role: "assistant",
        content: m.content.map(
          (b): Anthropic.ContentBlockParam =>
            b.type === "text"
              ? { type: "text", text: b.text }
              : {
                  type: "tool_use",
                  id: b.id,
                  name: b.name,
                  input: b.arugments,
                },
        ),
      };
    }
    return {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: m.toolCallId,
          content: m.content,
          is_error: m.isError,
        },
      ],
    };
  });
}
export function createAnthropic(): Provider {
  const client = new Anthropic();
  return {
    name: "anthrophic",
    defaultModel: "claude-sonnet-5",
    async *stream({ messages, model, system,tools=[] }) {
      const stream = client.messages.stream({
        max_tokens: 434,
        model,
        system,
        messages: toAnthropic(messages),
        tools:tools.map((t)=>({
          name:t.name,
          description:t.description,
          input_schema:t.parmaeters as Anthropic.Tool.InputSchema  
        }))
      });
      let text = "";
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          ((text += event.delta.text),
            yield { type: "text_delta", delta: event.delta.type });
        }
      }
      const final = await stream.finalMessage();
      const StopReason: StopReason =
        final.stop_reason === "max_tokens" ? "length" : "stop";
      yield {
        type: "done",
        message: {
          role: "assistant",
          content: text,
          usage: {
            input: final.usage.input_tokens,
            output: final.usage.output_tokens,
          },
          StopReason,
        },
      };
    },
  };
}
