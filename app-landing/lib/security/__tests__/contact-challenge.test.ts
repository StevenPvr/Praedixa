import { describe, expect, it } from "vitest";
import {
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
});
