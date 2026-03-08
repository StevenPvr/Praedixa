import type { Dictionary } from "../types";
import { frCoreFoundation } from "./fr-core-foundation";
import { frCoreOperations } from "./fr-core-operations";
import { frCoreConversion } from "./fr-core-conversion";

export const frCore: Partial<Dictionary> = {
  ...frCoreFoundation,
  ...frCoreOperations,
  ...frCoreConversion,
};
