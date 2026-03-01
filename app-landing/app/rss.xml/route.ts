import { NextResponse } from "next/server";
import { getPublishedBlogPosts } from "../../lib/blog/posts";
import { buildBlogRssXml } from "../../lib/blog/rss";

export const revalidate = 3600;

export async function GET() {
  const posts = getPublishedBlogPosts();
  const xml = buildBlogRssXml(posts);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
