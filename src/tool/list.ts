import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool } from "../type";

const MAX = 500;
const SKIP = new Set([".git", "node_modules", ".DS_Store"]);

export const listTool: Tool = {
  name: "list",
  description:
    "List files and folders directly inside a directory (like ls). " +
    "Each folder name gets a trailing '/'. Relative paths are relative " +
    "to the current folder. By default skips .git and node_modules.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Directory to list (default: current folder).",
      },
      all: {
        type: "boolean",
        description: "Include hidden files and noisy folders like .git.",
      },
    },
  },
  execute: async (a) => {
    const dir = (a as { path?: string }).path ?? ".";
    const all = Boolean((a as { all?: boolean }).all);
    const abs = resolve(dir);
    let names: string[];
