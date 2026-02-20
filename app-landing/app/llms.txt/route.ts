import { NextResponse } from "next/server";

const body = `# Praedixa

> Praedixa provides multi-site workforce coverage intelligence to anticipate staffing tensions, compare intervention options, and support auditable operations/finance decisions across sectors.

## Product Information

- [Praedixa Logistics Solution](https://www.praedixa.com/en/praedixa-logistics): Coverage decisions for logistics operations.
- [Praedixa Transport Solution](https://www.praedixa.com/en/praedixa-transport): Coverage trade-offs for transport reliability.
- [Praedixa Retail Distribution](https://www.praedixa.com/en/praedixa-retail-distribution): Coverage steering for retail/distribution networks.
- [Praedixa for Quick-Service Restaurants](https://www.praedixa.com/en/praedixa-quick-service-restaurants): Staffing anticipation for QSR multi-site networks.

## Planning and Forecasting

- [Capacity and Coverage Gaps](https://www.praedixa.com/en/capacity-coverage-gap): Shared frame for capacity risk reading.
- [Workload and Capacity Forecasting](https://www.praedixa.com/en/short-horizon-workload-capacity-forecast): Short-horizon forecasting method.
- [Calculate Coverage Gap Cost](https://www.praedixa.com/en/calculate-coverage-gap-cost): Cost-of-inaction framework.
- [Anticipate Absenteeism and Understaffing](https://www.praedixa.com/en/anticipate-absenteeism-understaffing): Coverage drift anticipation.
- [Staffing and Reallocation Playbook](https://www.praedixa.com/en/playbook-staffing-reallocation-options): Action options governance.

## Pilot Entry Offer

- [Pilot Application Overview](https://www.praedixa.com/en/pilot-application): Entry pilot focused on workforce forecasting and coverage decisions.
- [Pilot Protocol](https://www.praedixa.com/en/pilot-protocol): Pilot scope, governance, and operating cadence.

## Company Information

- [About Praedixa](https://www.praedixa.com/en/about): Company background and mission.
- [Contact Praedixa](https://www.praedixa.com/en/contact): Contact details for inquiries and support.

## Legal and Policies

- [Legal Notice](https://www.praedixa.com/en/legal-notice): Legal information and disclaimers.
- [Privacy Policy](https://www.praedixa.com/en/privacy-policy): Details on data privacy and usage.
- [Terms and Conditions](https://www.praedixa.com/en/terms): Terms of use for Praedixa's services.

## Resources and Security

- [Resources](https://www.praedixa.com/en/resources): Additional materials and documentation.
- [Security Practices](https://www.praedixa.com/en/security): Information on Praedixa's security measures.
`;

export async function GET() {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
