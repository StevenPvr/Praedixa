import { NextResponse } from "next/server";
import {
  buildChallengeClientContext,
  createContactChallenge,
} from "../../../../lib/security/contact-challenge";

export async function GET(request: Request) {
  const challenge = createContactChallenge(
    Date.now(),
    buildChallengeClientContext(request),
  );
  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge indisponible." },
      { status: 503 },
    );
  }

  return NextResponse.json(challenge, {
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
