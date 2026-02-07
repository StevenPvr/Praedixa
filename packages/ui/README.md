# @praedixa/ui

Composants React partagés pour la landing page.

## Stack

- React 19
- shadcn/ui (copié localement)
- Radix UI primitives
- Tailwind CSS 4
- Recharts (graphiques)

## Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── data-table.tsx
│   │   ├── charts/
│   │   │   ├── line-chart.tsx
│   │   │   ├── bar-chart.tsx
│   │   │   └── heatmap.tsx
│   │   └── ...
│   ├── hooks/
│   └── utils/
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

## Usage

```tsx
import { Button, Card, LineChart } from "@praedixa/ui";

<Card>
  <LineChart data={forecastData} />
  <Button>Voir détails</Button>
</Card>;
```

## Développement

```bash
pnpm --filter @praedixa/ui dev
```
