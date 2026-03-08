import { NextResponse } from "next/server";
import { buildLlmsFullTxt } from "../../lib/seo/llms";

export async function GET() {
  return new NextResponse(buildLlmsFullTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
