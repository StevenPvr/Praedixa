import { NextResponse } from "next/server";
import { createContactChallenge } from "../../../../lib/security/contact-challenge";

export async function GET() {
  const challenge = createContactChallenge();
  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge indisponible." },
      { status: 503 },
    );
  }

  return NextResponse.json(challenge, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
