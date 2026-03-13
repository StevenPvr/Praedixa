import {
  buildDatasetHealthView,
  buildDatasetHealthViews,
} from "@praedixa/shared-types/domain";
import type {
  DatasetHealthInput,
  DatasetHealthView,
} from "@praedixa/shared-types/domain";

export type { DatasetHealthInput, DatasetHealthView };

export function aggregateDatasetHealth(
  input: DatasetHealthInput,
): DatasetHealthView {
  return buildDatasetHealthView(input);
}

export function aggregateDatasetHealthList(
  inputs: readonly DatasetHealthInput[],
): DatasetHealthView[] {
  return buildDatasetHealthViews(inputs);
}
