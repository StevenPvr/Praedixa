export interface HeroVideoSourceOptions {
  userAgent: string;
  canPlayWebm: boolean;
  webmSrc: string;
  mp4Src: string;
}

const SAFARI_USER_AGENT_PATTERN = /Safari/i;
const NON_SAFARI_WEBKIT_PATTERN =
  /(Chrome|Chromium|CriOS|Edg|OPR|Opera|Firefox|FxiOS|SamsungBrowser)/i;

export function isSafariUserAgent(userAgent: string): boolean {
  return (
    Boolean(userAgent) &&
    SAFARI_USER_AGENT_PATTERN.test(userAgent) &&
    !NON_SAFARI_WEBKIT_PATTERN.test(userAgent)
  );
}

export function getHeroVideoSource({
  userAgent,
  canPlayWebm,
  webmSrc,
  mp4Src,
}: HeroVideoSourceOptions): string {
  if (isSafariUserAgent(userAgent)) {
    return mp4Src;
  }

  return canPlayWebm ? webmSrc : mp4Src;
}
