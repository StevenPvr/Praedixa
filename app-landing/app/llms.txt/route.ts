import { NextResponse } from "next/server";

const body = `# Praedixa

Official website: https://www.praedixa.com
Primary locale: fr-FR
Secondary locale: en

## Canonical entrypoints
- https://www.praedixa.com/fr
- https://www.praedixa.com/en
- https://www.praedixa.com/fr/ressources
- https://www.praedixa.com/en/resources

## Commercial pages
- https://www.praedixa.com/fr/devenir-pilote
- https://www.praedixa.com/en/pilot-application
- https://www.praedixa.com/fr/contact
- https://www.praedixa.com/en/contact

## Entity links
- https://linkedin.com/company/praedixa
`;

export async function GET() {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
