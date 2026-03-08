import type { Dictionary } from "../types";
import { enCoreFoundation } from "./en-core-foundation";
import { enCoreOperations } from "./en-core-operations";
import { enCoreConversion } from "./en-core-conversion";

export const enCore: Partial<Dictionary> = {
  ...enCoreFoundation,
  ...enCoreOperations,
  ...enCoreConversion,
};
