import type { Dictionary } from "../types";
import { frCore } from "./fr-core";
import { frGrowth } from "./fr-growth";

export const fr: Dictionary = {
  ...frCore,
  ...frGrowth,
} as Dictionary;
