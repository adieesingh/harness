import type {
  AssistantMessage,
  Message,
  Provider,
  Tool,
  ToolCallBlock,
} from "../type";
import {tools} from "../tool/index"
export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool_start"; call: ToolCallBlock }
  | { type: "tool_end"; call: ToolCallBlock; result: string; isError: boolean }
  | { type: "turn_end"; message: AssistantMessage }
  | { type: "message"; message: Message };

export type AgentOptions = {
  provider: Provider;
  model: string;
  system?: string;
  tools: Tool[];
  messages: Message[];
  maxTurns?: number;
  onEvent: (event: AgentEvent) => void;
};

export async function runAgent(opts: AgentOptions): Promise<void> {
  const { provider, model, system, messages, onEvent } = opts;
  const maxTurns = opts.maxTurns ?? 50;
  const push = (message: Message) => {
    messages.push(message);
    onEvent({ type: "message", message });
  };

  for (let turn = 1; turn <= maxTurns; ++turn) {
    let assitant: AssistantMessage | undefined;
    const MAX_RECENT_MESSAGE=8;
    const trimmedMessages = messages.length > MAX_RECENT_MESSAGE 
    ? [messages[0]!,...messages.slice(-MAX_RECENT_MESSAGE)]
    : messages;
    for await (const event of provider.stream({
      messages:trimmedMessages , 
      model,
      system,
      tools,    
    })) {
      if (event.type === "text_delta")
        onEvent({ type: "text", delta: event.delta });
      else  assitant = event.message;
    }
    if (!assitant) throw new Error("assistant is empty ")
    push(assitant)
    onEvent({type:"turn_end",message:assitant})

    if(assitant.StopReason !== "toolUse") return

    for (const call of assitant.content){
        if(call.type !== "toolCall") continue;
        onEvent({type:"tool_start",call})
        let result:string;
        let isError=false;

        try {
            const tool=tools.find((t:any)=>t.name==call.name);
            if(!tool) throw new Error(`unknown tool name ${call.name}`)
                result = await tool.execute(call.arguments)
        } catch (e) {
            result = `Error ${e instanceof Error?e.message:String(e)}`
            isError=true
        }
        onEvent({type:"tool_end",call,result,isError})
        push({role:"toolResult",toolCallId:call.id,toolName:call.name,content:result,isError})
    }
  }
  throw new Error(`maxTurn is ${maxTurns} is done`)
}
