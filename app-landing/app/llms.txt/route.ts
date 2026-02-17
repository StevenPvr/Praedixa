import { NextResponse } from "next/server";

const body = `# Praedixa

> Praedixa offers logistics and workforce capacity planning solutions to optimize operations, anticipate absenteeism, and manage coverage gaps for logistics, transport, and retail distribution sectors.

## Product Information

- [Praedixa Logistics Solution](https://www.praedixa.com/en/praedixa-logistics): Overview of Praedixa's logistics capacity planning product.
- [Praedixa Transport Solution](https://www.praedixa.com/en/praedixa-transport): Details on Praedixa's transport capacity management offering.
- [Praedixa Retail Distribution](https://www.praedixa.com/en/praedixa-retail-distribution): Information about Praedixa's retail distribution optimization.

## Planning and Forecasting

- [Logistics Capacity Planning](https://www.praedixa.com/en/logistics-capacity-planning): Techniques and tools for planning logistics workforce capacity.
- [Workload and Capacity Forecasting](https://www.praedixa.com/en/short-horizon-workload-capacity-forecast): Methods for forecasting workload and capacity in the short term.
- [Forecast Warehouse Workload](https://www.praedixa.com/en/forecast-warehouse-workload): Guidance on warehouse workload forecasting.
- [Calculate Coverage Gap Cost](https://www.praedixa.com/en/calculate-coverage-gap-cost): How to calculate the cost impact of capacity coverage gaps.
- [Anticipate Absenteeism and Understaffing](https://www.praedixa.com/en/anticipate-absenteeism-understaffing): Strategies to foresee absenteeism and staff shortages.
- [Logistics Penalties Anticipation](https://www.praedixa.com/en/logistics-penalties-anticipation): Information on anticipating penalties due to logistics delays.

## Optional: Pilot Program

- [Pilot Application Overview](https://www.praedixa.com/en/pilot-application): Details about becoming a pilot user of Praedixa's solutions.
- [Pilot Protocol](https://www.praedixa.com/en/pilot-protocol): Protocol information for pilot participants.

## Optional: Company Information

- [About Praedixa](https://www.praedixa.com/en/about): Company background and mission.
- [Contact Praedixa](https://www.praedixa.com/en/contact): Contact details for inquiries and support.

## Optional: Legal and Policies

- [Legal Notice](https://www.praedixa.com/en/legal-notice): Legal information and disclaimers.
- [Privacy Policy](https://www.praedixa.com/en/privacy-policy): Details on data privacy and usage.
- [Terms and Conditions](https://www.praedixa.com/en/terms): Terms of use for Praedixa's services.

## Optional: Resources and Security

- [Resources](https://www.praedixa.com/en/resources): Additional materials and documentation.
- [Security Practices](https://www.praedixa.com/en/security): Information on Praedixa's security measures.

## Optional: Comparison and Playbooks

- [RMS vs Praedixa](https://www.praedixa.com/en/rms-vs-praedixa): Comparison between RMS and Praedixa solutions.
- [Staffing and Reallocation Playbook](https://www.praedixa.com/en/playbook-staffing-reallocation-options): Guidance on staffing and resource reallocation options.
`;

export async function GET() {
  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
