import { vi } from "vitest";

export const mockEmailsSend = vi.fn(() =>
  Promise.resolve({ data: { id: "mock-email-id" }, error: null }),
);

let mockError: Error | null = null;

export function setResendError(error: Error | null) {
  mockError = error;
  if (error) {
    mockEmailsSend.mockRejectedValue(error);
  } else {
    mockEmailsSend.mockResolvedValue({
      data: { id: "mock-email-id" },
      error: null,
    });
  }
}

export function resetResend() {
  mockError = null;
  mockEmailsSend.mockReset();
  mockEmailsSend.mockResolvedValue({
    data: { id: "mock-email-id" },
    error: null,
  });
}

export class MockResend {
  emails = { send: mockEmailsSend };

  constructor(_apiKey?: string) {
    // Validate API key presence like the real SDK
    if (!_apiKey) {
      throw new Error("Missing API key");
    }
  }
}

export function createResendMock() {
  return {
    Resend: MockResend,
  };
}
