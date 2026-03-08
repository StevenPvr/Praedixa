import type { Dictionary } from "../types";
import { enCore } from "./en-core";
import { enGrowth } from "./en-growth";

export const en: Dictionary = {
  ...enCore,
  ...enGrowth,
} as Dictionary;
