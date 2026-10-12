export type Usage = { input: number, output: number }
export type StopReason = "length" | "stop" | "toolUse";
export type TextBlock = { type: "text", text: string }
export type ToolCallBlock = { type: "text", id: string, name: string, arguments: Record<string, unknown> }
export type ContentBlock = TextBlock | ToolCallBlock;
export type UserMessage = { role: "user"; content: string }
export type AssistantMessage = {
    role: "assistant",
    content: ContentBlock[],
    usage: Usage,
    StopReason: StopReason
}
export type ToolResultMessage = { role: "toolResult", toolCallId: string, toolName: string, content: string, isError: boolean }

export type Message = AssistantMessage | UserMessage | ToolResultMessage

export type ToolSpec = { name: string, description: string }
export type Tool = ToolSpec & {execute (args:Record<string,unknown>):Promise<string>}

export type StreamEvent =
    | { type: "text_delta"; delta: string } | { type: "done"; message: AssistantMessage }

export type StreamOptions = {
    messages: Message[],
    model: string,
    system?: string,
    tool?:ToolSpec[]
}

export interface Provider {
    name: string,
    defaultModel: string,
    stream(opts: StreamOptions): AsyncIterable<StreamEvent>

}