import fs from "node:fs";
import path from "node:path";

export const BLOG_ROUTE_SEGMENT = "blog";
export const BLOG_POSTS_PER_PAGE = 12;

const CONTENT_DIRECTORY_CANDIDATES = [
  path.resolve(process.cwd(), "content"),
  path.resolve(process.cwd(), "..", "content"),
];

function resolveExistingDirectory(candidates: string[]): string {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return candidates[0] ?? path.resolve(process.cwd(), "content");
}

export function resolveContentDirectory(): string {
  return resolveExistingDirectory(CONTENT_DIRECTORY_CANDIDATES);
}

export function resolveBlogContentDirectory(): string {
  return path.join(resolveContentDirectory(), BLOG_ROUTE_SEGMENT);
}

export function resolveInternalLinksConfigPath(): string {
  return path.join(resolveContentDirectory(), "internal-links.json");
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}
