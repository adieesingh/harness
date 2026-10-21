import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { parseArgs } from "node:util";
import { getProvider } from "./providers";
import type { AssistantMessage, Message } from "./type";
import { readTool } from "./tool/read";

// loading env
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
const tools = [readTool];

const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    provider: { type: "string", default: "groq" },
    model: { type: "string" },
  },
});

if (!values.prompt) {
  console.log("no found prompt");
  process.exit(1);
}
const provider = getProvider(values.provider);
const model = values.model ?? provider.defaultModel;
const messages: Message[] = [{ role: "user", content: values.prompt }];

async function callModel(): Promise<AssistantMessage> {
  for await (const event of provider.stream({ messages, model, tools })) {
    if (event.type === "text_delta") process.stdout.write(event.delta);
    else {
      const { usage, StopReason } = event.message;
      console.log(
        `\n \n ${provider.name} .. ${model}..${usage.input} ..${StopReason} .. ${usage.input} .. ${usage.output}`,
      );
      return event.message;
    }
  }
  throw new Error("stream ended without a done event");
}
const first = await callModel();
messages.push(first);
if (first.StopReason == "toolUse") {
  for (const block of first.content) {
    if (block.type !== "toolCall") continue;
    console.log(`-> ${block.name} (${JSON.stringify(block.arguments)})`);
    const result = await readTool.execute(block.arguments);
    messages.push({
      role: "toolResult",
      toolCallId: block.id,
      toolName: block.name,
      content: result,
      isError: false,
    });
  }
  messages.push(await callModel());
}

// for await (const event of provider.stream({ messages, model })) {
//   if (event.type === "text_delta") process.stdout.write(event.delta);
//   else {
//     const { usage, StopReason } = event.message;
//     console.log(
//       `\n \n ${provider.name} .. ${model}..${usage.input} ..${StopReason} .. ${usage.input} .. ${usage.output}`,
//     );
//   }
// }

// const client = new Anthropic();

// const stream = client.messages.stream({
//     max_tokens: 1024,
//     messages: [{ content: values.prompt, role: "user" }],
//     model: values.model

// })
// for await (const event of stream) {
//     if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
//         process.stdout.write(event.delta.text)
//     }
// }

// const final = await stream.finalMessage();
// console.log(final)
// console.log(final.usage.input_tokens)
// console.log(final.usage.output_tokens)
// console.log(final.stop_reason)
