import type { Plugin } from "vite";
import type { Options } from "./options.mjs";

export function releaseNotesPlugin(overrides?: Partial<Options>): Plugin[];
