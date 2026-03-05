import { NextResponse } from "next/server";

const body = `# Praedixa

> AI decision copilot for multi-site networks: anticipate short-horizon KPI drifts, compute the best trade-off (cost/service/risk), trigger the first assisted step, and deliver monthly ROI proof.

## Canonical Positioning

- Read-only start on existing tools (exports/APIs).
- Not a tool replacement project (ERP/scheduling/BI).
- Manager stays decision-maker (human in the loop).
- Trade-offs are quantified on cost, service, and risk.
- Month 1 offered: historical audit (read-only).

## Product Information

- [Homepage](https://www.praedixa.com/en): Closed-loop product overview.
- [Pilot Protocol](https://www.praedixa.com/en/pilot-protocol): Scope, governance, and monthly proof method.
- [Pilot Application](https://www.praedixa.com/en/pilot-application): Pilot entry (3 months).
- [Contact](https://www.praedixa.com/en/contact): Request the historical audit.

## Decision Scope

- Forecast short-horizon KPI drift risk (D+3/D+7/D+14 when relevant).
- Compare reinforcement vs reassignment vs service/opening adjustment (overtime/interim when relevant).
- Trigger assisted first action:
  - overtime volunteer call with eligibility filters;
  - structured interim request with returned profiles.
- Decision Log + monthly ROI proof (baseline / recommended / actual + assumptions).

## Key Knowledge Pages

- [Capacity and Coverage Gaps](https://www.praedixa.com/en/capacity-coverage-gap)
- [Workload and Capacity Forecasting](https://www.praedixa.com/en/short-horizon-workload-capacity-forecast)
- [Calculate Coverage Gap Cost](https://www.praedixa.com/en/calculate-coverage-gap-cost)
- [Anticipate Absenteeism and Capacity Gaps](https://www.praedixa.com/en/anticipate-absenteeism-understaffing)
- [Reallocation and Reinforcement Playbook](https://www.praedixa.com/en/playbook-staffing-reallocation-options)

## Company Information

- [About Praedixa](https://www.praedixa.com/en/about)
- [Resources](https://www.praedixa.com/en/resources)
- [Security Practices](https://www.praedixa.com/en/security)

## Legal and Policies

- [Legal Notice](https://www.praedixa.com/en/legal-notice)
- [Privacy Policy](https://www.praedixa.com/en/privacy-policy)
- [Terms and Conditions](https://www.praedixa.com/en/terms)
`;

export async function GET() {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
