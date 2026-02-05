# @praedixa/shared-types

Types TypeScript partagés entre toutes les applications.

## Contenu

- DTOs API (request/response)
- Types métier
- Enums partagés
- Zod schemas (validation runtime)

## Structure

```
shared-types/
├── src/
│   ├── api/
│   │   ├── auth.ts
│   │   ├── tenants.ts
│   │   ├── forecasts.ts
│   │   ├── recommendations.ts
│   │   └── decisions.ts
│   ├── domain/
│   │   ├── tenant.ts
│   │   ├── user.ts
│   │   ├── site.ts
│   │   ├── forecast.ts
│   │   └── lineage.ts
│   ├── enums.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Exemple

```typescript
// src/domain/forecast.ts
export interface Forecast {
  id: string;
  tenantId: string;
  siteId: string;
  teamId: string;
  date: string;
  horizon: "D+3" | "D+7" | "D+14";
  riskScore: number; // 0-100
  etpMissing: number; // ETP manquants prévus
  confidence: number; // 0-1
  createdAt: string;
  lineageId: string;
}

// src/api/forecasts.ts
export interface GetForecastsRequest {
  siteId?: string;
  teamId?: string;
  startDate: string;
  endDate: string;
  horizon?: "D+3" | "D+7" | "D+14";
}

export interface GetForecastsResponse {
  forecasts: Forecast[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}
```

## Usage

```typescript
import type { Forecast, GetForecastsResponse } from "@praedixa/shared-types";

const response: GetForecastsResponse = await api.get("/forecasts");
const forecasts: Forecast[] = response.forecasts;
```
