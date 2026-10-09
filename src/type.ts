export type Usage = {input:number, output:number}
export type StopReason = "length"|"stop"|"toolUse";

export type UserMessage = {role:"user";content:string}
export type AssistantMessage ={role:"assistant";content:string;
    usage:Usage,
    StopReason:StopReason
}
export type Message= AssistantMessage|UserMessage

export type StreamEvent = 
    | {type:"text_delta";delta:string}
    |{type:"done";message:AssistantMessage}

export type StreamOptions = {
    messages:Message[],
    model:string,
    system?:string
}

export interface Provider {
    name:string,
    defaultModel:string,
    stream(opts:StreamOptions):AsyncIterable<StreamEvent>
    
}