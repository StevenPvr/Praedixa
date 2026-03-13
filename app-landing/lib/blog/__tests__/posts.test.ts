import { describe, expect, it } from "vitest";
import {
  buildBlogIndexPath,
  buildBlogPostPath,
  getAllBlogPosts,
  getBlogPostBySlug,
  getPaginatedBlogPosts,
  getPublishedBlogPosts,
  parseBlogListSearchParams,
} from "../posts";

describe("blog posts store", () => {
  it("loads mdx blog posts from the content directory", () => {
    const posts = getAllBlogPosts();

    expect(Array.isArray(posts)).toBe(true);
    expect(posts.every((post) => post.slug.length > 0)).toBe(true);
    expect(posts.every((post) => post.title.length > 0)).toBe(true);
  });

  it("filters published posts", () => {
    const publishedPosts = getPublishedBlogPosts();
    expect(publishedPosts.every((post) => post.draft === false)).toBe(true);
  });

  it("returns null when a post cannot be found by locale and slug", () => {
    const frPost = getBlogPostBySlug(
      "fr",
      "sous-sureeffectif-multi-sites-guide-j3-j7-j14",
      {
        includeDrafts: false,
      },
    );
    expect(frPost).toBeNull();
  });

  it("parses search params with defaults", () => {
    const parsed = parseBlogListSearchParams({});
    expect(parsed.page).toBe(1);
    expect(parsed.tag).toBeUndefined();
  });

  it("builds blog index and post paths", () => {
    expect(buildBlogPostPath("fr", "demo")).toBe("/fr/blog/demo");
    expect(buildBlogIndexPath("en", { page: 2, tag: "ops" })).toBe(
      "/en/blog?tag=ops&page=2",
    );
  });

  it("paginates blog posts", () => {
    const result = getPaginatedBlogPosts("fr", { page: 1 });

    expect(result.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.posts.length).toBeGreaterThanOrEqual(0);
  });
});
