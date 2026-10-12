import { resolve } from "node:path";
import type { Tool } from "../type";
import { readFile } from "node:fs/promises";

export const readTool: Tool = {                   
  name: "read",
  description: "Read a text file and returns content",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to relative file, relative to current folder",
      },
    },
    required: ["path"],
  },
  async execute(args) {
    return readFile(resolve(process.cwd(), String(args.path)), "utf-8");
  },
};
