import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildChallengeClientContext,
  createContactChallenge,
  verifyContactChallenge,
} from "../contact-challenge";

function parseCaptchaSum(challengeToken: string): number {
  const [payloadPart] = challengeToken.split(".");
  if (!payloadPart) throw new Error("Invalid challenge token");
  const decoded = Buffer.from(payloadPart, "base64url").toString("utf8");
  const payload = JSON.parse(decoded) as { a: number; b: number };
  return payload.a + payload.b;
}

describe("contact challenge", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates and verifies a valid challenge", () => {
    const challenge = createContactChallenge(Date.now() - 5_000);
    expect(challenge).toBeTruthy();
    if (!challenge) return;

    const captchaAnswer = parseCaptchaSum(challenge.challengeToken);
    const verification = verifyContactChallenge({
      challengeToken: challenge.challengeToken,
      captchaAnswer,
    });
    expect(verification).toEqual({ valid: true });
  });

  it("rejects tampered challenge tokens", () => {
    const challenge = createContactChallenge(Date.now() - 5_000);
    expect(challenge).toBeTruthy();
    if (!challenge) return;

    const tamperedToken = `${challenge.challengeToken}x`;
    const captchaAnswer = parseCaptchaSum(challenge.challengeToken);
    const verification = verifyContactChallenge({
      challengeToken: tamperedToken,
      captchaAnswer,
    });

    expect(verification.valid).toBe(false);
  });

  it("rejects incorrect answers", () => {
    const challenge = createContactChallenge(Date.now() - 5_000);
    expect(challenge).toBeTruthy();
    if (!challenge) return;

    const captchaAnswer = parseCaptchaSum(challenge.challengeToken) + 1;
    const verification = verifyContactChallenge({
      challengeToken: challenge.challengeToken,
      captchaAnswer,
    });

    expect(verification).toEqual({ valid: false, reason: "incorrect-answer" });
  });

  it("rejects too-fast submissions", () => {
    const challenge = createContactChallenge(Date.now() - 100);
    expect(challenge).toBeTruthy();
    if (!challenge) return;

    const captchaAnswer = parseCaptchaSum(challenge.challengeToken);
    const verification = verifyContactChallenge({
      challengeToken: challenge.challengeToken,
      captchaAnswer,
    });

    expect(verification).toEqual({ valid: false, reason: "too-fast" });
  });

  it("rejects expired submissions", () => {
    const challenge = createContactChallenge(Date.now() - 1000 * 60 * 60 * 5);
    expect(challenge).toBeTruthy();
    if (!challenge) return;

    const captchaAnswer = parseCaptchaSum(challenge.challengeToken);
    const verification = verifyContactChallenge({
      challengeToken: challenge.challengeToken,
      captchaAnswer,
    });

    expect(verification).toEqual({ valid: false, reason: "expired" });
  });

  it("binds the challenge to the originating client context when provided", () => {
    const request = new Request(
      "https://www.praedixa.com/api/contact/challenge",
      {
        headers: {
          "cf-connecting-ip": "203.0.113.10",
          "user-agent": "Vitest Browser",
        },
      },
    );
    const clientContext = buildChallengeClientContext(request);
    const challenge = createContactChallenge(Date.now() - 5_000, clientContext);
    expect(challenge).toBeTruthy();
    if (!challenge) return;

    const captchaAnswer = parseCaptchaSum(challenge.challengeToken);
    const verification = verifyContactChallenge({
      challengeToken: challenge.challengeToken,
      captchaAnswer,
      clientContext: "mismatched-client-context",
    });

    expect(verification).toEqual({ valid: false, reason: "invalid-context" });
  });

  it("requires a dedicated secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTACT_FORM_CHALLENGE_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "re_live_should_not_be_reused");
    vi.stubEnv("CONTACT_API_INGEST_TOKEN", "ingest_should_not_be_reused");

    expect(createContactChallenge()).toBeNull();
  });
});
