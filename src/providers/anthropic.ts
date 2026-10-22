import Anthropic from "@anthropic-ai/sdk";
import type {
  StopReason,
  Provider,
  StreamOptions,
  Message,
  ContentBlock,
  ToolResultMessage,
} from "../type";


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
                  input: b.arguments,
                
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
    async *stream({ messages, model, system, tools = [] }) {
      const stream = client.messages.stream({
        max_tokens: 434,
        model,
        system,
        messages: toAnthropic(messages),
        tools: tools.length ? tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })) : undefined,
      });
      let text = "";
      let json = "";
      let content: ContentBlock[] = [];
      for await (const event of stream) {
        if (event.type === "content_block_start") {
          const b = event.content_block;
          if (b.type === "text") content.push({ type: "text", text:" "});
          else if (b.type === "tool_use") {
            content.push({
              type: "toolCall",
              id: b.id,
              name: b.name,
              arguments: {},
            })
            json = "";
          }
        } else if (event.type === "content_block_delta") {
          const block = content.at(-1);
          if (event.delta.type === "text_delta" && block?.type == "text") {
            block.text += event.delta.text;
            yield {type:"text_delta",delta:event.delta.text};
          }else if(event.delta.type==="input_json_delta"){
            json+=event.delta.partial_json
          }
        }
      }
      const final = await stream.finalMessage();
      const StopReason: StopReason =
        final.stop_reason === "tool_use"
          ? "toolUse"
          : final.stop_reason === "max_tokens"
            ? "length"
            : "stop";
      yield {
        type: "done",
        message: {
          role: "assistant",
          content,
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
