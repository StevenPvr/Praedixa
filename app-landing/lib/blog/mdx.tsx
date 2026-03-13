import type { ReactElement } from "react";
import { evaluate } from "@mdx-js/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import * as jsxRuntime from "react/jsx-runtime";
import { isProductionEnvironment } from "./config";
import {
  createRehypeInternalLinksPlugin,
  getInternalLinkRules,
} from "./internal-links";
import { buildBlogPostPath } from "./posts";
import type { BlogPost } from "./types";

interface EvaluatedMdxModule {
  default: (props: { components?: Record<string, unknown> }) => ReactElement;
}

export interface CompiledBlogMdx {
  Content: (props: { components?: Record<string, unknown> }) => ReactElement;
  generatedAutoLinks: string[];
}

const compiledContentCache = new Map<string, Promise<CompiledBlogMdx>>();

function shouldUseCache(): boolean {
  return isProductionEnvironment();
}

function buildCacheKey(post: BlogPost): string {
  return `${post.locale}:${post.slug}:${post.dateIso}:${post.disableAutoLinks ? "1" : "0"}`;
}

async function compilePostContent(post: BlogPost): Promise<CompiledBlogMdx> {
  const generatedAutoLinks = new Set<string>();
  const internalLinkRules = post.disableAutoLinks
    ? []
    : getInternalLinkRules({ locale: post.locale });

  const evaluated = (await evaluate(post.body, {
    ...jsxRuntime,
    baseUrl: import.meta.url,
    development: false,
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          properties: {
            className: ["blog-heading-anchor"],
            ariaLabel: "Anchor link",
          },
          content: {
            type: "text",
            value: "#",
          },
        },
      ],
      createRehypeInternalLinksPlugin({
        rules: internalLinkRules,
        disabled: post.disableAutoLinks,
        generatedUrls: generatedAutoLinks,
        excludeUrls: [buildBlogPostPath(post.locale, post.slug)],
      }),
    ],
  })) as unknown as EvaluatedMdxModule;

  return {
    Content: evaluated.default,
    generatedAutoLinks: Array.from(generatedAutoLinks),
  };
}

export async function getCompiledBlogMdx(
  post: BlogPost,
): Promise<CompiledBlogMdx> {
  if (!shouldUseCache()) {
    return compilePostContent(post);
  }

  const key = buildCacheKey(post);
  const cached = compiledContentCache.get(key);
  if (cached) {
    return cached;
  }

  const compilationPromise = compilePostContent(post);
  compiledContentCache.set(key, compilationPromise);
  return compilationPromise;
}
