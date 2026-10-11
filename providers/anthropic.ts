import Anthropic from "@anthropic-ai/sdk";
import type { StopReason, Provider, StreamOptions } from "../src/type";

export function createAnthropic(): Provider {
    const client = new Anthropic();
    return {
        name: "anthrophic",
        defaultModel: "claude-sonnet-5",
        async *stream({ messages, model, system }) {
            const stream = client.messages.stream({
                max_tokens: 434,
                model,
                system,
                messages: messages.map((r) => ({ role: r.role, content: r.content  })),
            });
            let text = "";
            for await (const event of stream) {
                if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                    text += event.delta.text,
                        yield { type: "text_delta", delta: event.delta.type }

                }
            }
            const final = await stream.finalMessage();
            const StopReason: StopReason = final.stop_reason === "max_tokens" ? "length" : "stop";
            yield {
                type: "done",
                message: {
                    role: "assistant",
                    content: text,
                    usage: { input: final.usage.input_tokens, output: final.usage.output_tokens },
                    StopReason
                }
            }
        }
    }

}

