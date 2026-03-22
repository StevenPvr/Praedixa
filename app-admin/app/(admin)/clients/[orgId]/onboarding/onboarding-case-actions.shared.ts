"use client";

import { ApiError } from "@/lib/api/client";

type ToastLike = {
  success: (message: string) => void;
  error: (message: string) => void;
};

type OnboardingCaseActionContext = {
  orgId: string;
  selectedCaseId: string | null;
  refetchCases: () => void;
  refetchCaseDetail: () => void;
  toast: ToastLike;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export type { OnboardingCaseActionContext, ToastLike };
export { getErrorMessage };
