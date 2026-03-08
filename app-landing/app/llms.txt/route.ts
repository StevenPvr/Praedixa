import { NextResponse } from "next/server";
import { buildLlmsTxt } from "../../lib/seo/llms";

export async function GET() {
  return new NextResponse(buildLlmsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
