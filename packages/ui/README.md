# @praedixa/ui

Bibliotheque de composants React partages pour les trois applications Praedixa (landing, webapp, admin). Construite sur React 19, TypeScript, class-variance-authority (cva), Tailwind CSS et les primitives Radix UI / shadcn/ui.

## Table des matieres

- [Installation et build](#installation-et-build)
- [Catalogue des composants](#catalogue-des-composants)
  - [Layout](#layout)
  - [Affichage de donnees](#affichage-de-donnees)
  - [Graphiques](#graphiques)
  - [Formulaires](#formulaires)
  - [Feedback](#feedback)
  - [Divers](#divers)
- [Utilitaires](#utilitaires)
- [Design system](#design-system)
- [Pieges courants](#pieges-courants)
- [Tests](#tests)

---

## Installation et build

Le package est interne au monorepo (`"private": true`). Toutes les apps l'importent via :

```tsx
import { Button, DataTable, StatCard } from "@praedixa/ui";
```

**Ordre de build obligatoire** : `shared-types` -> `ui` -> apps. La commande `pnpm build` dans le monorepo respecte cet ordre automatiquement. Le build produit les fichiers compiles dans `dist/` via `tsc --build --force`, pour ne pas laisser un cache incremental stale masquer un `dist/` invalide.

Le package est publie en ESM interne: les imports relatifs dans `src/` doivent donc rester ecrits avec des suffixes `.js` (`./utils/cn.js`, `./components/button.js`, etc.) pour que `dist/` reste executable dans un builder propre, y compris en Docker.

```bash
# Build uniquement ce package
pnpm --filter @praedixa/ui build

# Watch mode (developpement)
pnpm --filter @praedixa/ui dev
```

**Dependances runtime** : `class-variance-authority`, `clsx`, `tailwind-merge`.
**Peer dependencies** : `react ^19.0.0`, `react-dom ^19.0.0`.

---

## Catalogue des composants

### Layout

#### Button

Bouton avec variantes cva, etats de chargement et icones.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

```tsx
<Button variant="default" size="lg" loading={isSubmitting}>
  Enregistrer
</Button>

<Button variant="outline" leftIcon={<PlusIcon />}>
  Ajouter un site
</Button>
```

| Variante      | Apparence                                                |
| ------------- | -------------------------------------------------------- |
| `default`     | Fond amber-500, texte blanc, effet `active:scale-[0.98]` |
| `destructive` | Fond rouge                                               |
| `outline`     | Bordure, fond transparent                                |
| `secondary`   | Fond secondaire                                          |
| `ghost`       | Transparent, hover colore                                |
| `link`        | Texte souligne au hover                                  |

---

#### Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

Conteneur de carte standard, style `rounded-2xl` avec `shadow-soft` et transition vers `shadow-card` au hover.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Previsions J+7</CardTitle>
    <CardDescription>Couverture estimee par site</CardDescription>
  </CardHeader>
  <CardContent>{/* contenu */}</CardContent>
  <CardFooter>
    <Button variant="outline">Voir tout</Button>
  </CardFooter>
</Card>
```

Tous les sous-composants acceptent `className` et les attributs HTML standard via `React.HTMLAttributes<HTMLDivElement>`.

---

#### DetailCard

Carte simplifiee avec titre optionnel et padding configurable.

```typescript
interface DetailCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  padding?: "compact" | "default" | "loose";
}
```

```tsx
<DetailCard title="Parametres du site" padding="compact">
  <p>Contenu ici</p>
</DetailCard>
```

> **Piege** : `padding` n'accepte que `"compact"`, `"default"` ou `"loose"`. Pour supprimer tout padding, utiliser `className="p-0"` au lieu d'une valeur personnalisee.

---

#### PageHeader

En-tete de page avec titre h1, sous-titre, fil d'Ariane et slot d'actions.

```typescript
interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  size?: "default" | "large"; // "large" utilise font-serif + text-3xl
  borderBottom?: boolean;
}
```

```tsx
<PageHeader
  title="Gestion des absences"
  subtitle="Suivi et previsions"
  breadcrumbs={[{ label: "Accueil", href: "/" }, { label: "Absences" }]}
  actions={<Button>Exporter</Button>}
  borderBottom
/>
```

---

#### Badge

Pastille avec variantes semantiques via cva.

```typescript
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "error"
    | "info";
}
```

```tsx
<Badge variant="success">Actif</Badge>
<Badge variant="warning">En attente</Badge>
```

---

#### StatusBadge

Pastille de statut avec point colore et label texte.

```typescript
interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
}
```

```tsx
<StatusBadge variant="danger" size="sm" label="Critique" />
<StatusBadge variant="success" label="Resolu" />
```

---

### Affichage de donnees

#### DataTable

Tableau generique avec tri, pagination, selection par checkbox et colonnes redimensionnables.

```typescript
interface DataTableColumn<T> {
  key: string;
  label: string; // libelle affiche en en-tete
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
}

interface DataTableSort {
  key: string;
  direction: "asc" | "desc";
}

interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableSelection {
  selectedKeys: Set<string | number>;
  onSelectionChange: (keys: Set<string | number>) => void;
  mode?: "single" | "multiple";
}

interface DataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn<T>[];
  data: T[];
  sort?: DataTableSort;
  onSort?: (sort: DataTableSort) => void;
  pagination?: DataTablePagination;
  getRowKey?: (row: T, index: number) => string | number;
  emptyMessage?: string; // defaut: "Aucune donnee"
  selection?: DataTableSelection;
  stickyHeader?: boolean;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T, index: number) => void;
}
```

```tsx
const columns: DataTableColumn<Alert>[] = [
  { key: "site", label: "Site", sortable: true },
  {
    key: "severity",
    label: "Severite",
    render: (row) => (
      <StatusBadge label={row.severity} variant={row.severity} />
    ),
  },
  { key: "gapH", label: "Deficit (h)", align: "right" },
];

<DataTable
  columns={columns}
  data={alerts}
  sort={sort}
  onSort={setSort}
  pagination={{ page, pageSize: 20, total: 143, onPageChange: setPage }}
  getRowKey={(row) => row.id}
  stickyHeader
/>;
```

> **Piege** : la propriete de colonne s'appelle `label`, pas `header`. Il n'y a pas de propriete `header`.

---

#### DataTableToolbar

Barre d'actions contextuelle affichee au-dessus d'un DataTable quand des lignes sont selectionnees.

```typescript
interface DataTableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  children: React.ReactNode; // boutons d'action bulk
}
```

```tsx
{
  selection.selectedKeys.size > 0 && (
    <DataTableToolbar
      selectedCount={selection.selectedKeys.size}
      totalCount={data.length}
      onClearSelection={() => selection.onSelectionChange(new Set())}
    >
      <Button variant="destructive" size="sm">
        Supprimer
      </Button>
    </DataTableToolbar>
  );
}
```

---

#### StatCard

Carte KPI pour tableaux de bord avec valeur, label, tendance et icone.

```typescript
type TrendDirection = "up" | "down" | "flat";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string; // la valeur DOIT etre un String
  label: string; // libelle du KPI (PAS "title")
  trend?: string; // ex. "+12.5%"
  trendDirection?: TrendDirection;
  icon?: React.ReactNode; // element JSX, PAS une reference de composant
  variant?: "default" | "accent" | "success" | "warning" | "danger";
}
```

```tsx
<StatCard
  value={String(coverage)}
  label="Taux de couverture"
  trend="+2.3%"
  trendDirection="up"
  icon={<ShieldIcon className="h-5 w-5" />}
  variant="success"
/>
```

> **Pieges** :
>
> - `value` attend un `string`, pas un `number`. Toujours utiliser `String(n)` ou une template string.
> - La prop s'appelle `label`, pas `title`.
> - `icon` attend un element JSX rendu (`<Icon />`) et non une reference de composant (`Icon`).

---

#### MetricCard

Indicateur compact avec pastille de statut coloree. Plus simple que StatCard, destine aux metriques inline.

```typescript
type MetricStatus = "good" | "warning" | "danger" | "neutral";

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  status?: MetricStatus; // defaut: "neutral"
}
```

```tsx
<MetricCard label="MAE" value="3.2" unit="h" status="good" />
<MetricCard label="Retard moyen" value={12} unit="min" status="warning" />
```

---

#### HeatmapGrid

Grille de heatmap pour visualiser la couverture ou le risque par site/shift/date. Les couleurs interpolent en espace OKLCH (rouge -> ambre -> vert).

```typescript
interface HeatmapCell {
  row: string;
  column: string;
  value: number; // 0-100
  label?: string;
}

interface HeatmapGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cells: HeatmapCell[];
  rows: string[];
  columns: string[];
  colorScale?: "coverage" | "risk"; // defaut: "coverage"
  onCellClick?: (cell: HeatmapCell) => void;
}
```

```tsx
<HeatmapGrid
  rows={sites}
  columns={dates}
  cells={coverageData}
  colorScale="coverage"
  onCellClick={(cell) =>
    navigate(`/alerts?site=${cell.row}&date=${cell.column}`)
  }
/>
```

`colorScale="coverage"` : 0% = rouge, 100% = vert.
`colorScale="risk"` : echelle inversee (0% = vert, 100% = rouge).

---

### Graphiques

#### WaterfallChart

Diagramme en cascade (waterfall) pour l'analyse des couts : BAU -> ajustements -> total.

```typescript
interface WaterfallItem {
  label: string;
  value: number;
  type: "positive" | "negative" | "total";
}

interface WaterfallChartProps extends React.HTMLAttributes<HTMLDivElement> {
  items: WaterfallItem[];
  formatValue?: (value: number) => string;
}
```

```tsx
<WaterfallChart
  items={[
    { label: "Cout BAU", value: 45000, type: "total" },
    { label: "Heures sup", value: -3200, type: "negative" },
    { label: "Interim", value: -8100, type: "negative" },
    { label: "Economies", value: 5400, type: "positive" },
    { label: "Cout reel", value: 39100, type: "total" },
  ]}
  formatValue={(v) => `${(v / 1000).toFixed(1)}k EUR`}
/>
```

Rendu en SVG. Affiche "Aucune donnee" si `items` est vide.

---

#### ParetoChart

Nuage de points avec frontiere de Pareto pour l'analyse cout/service des scenarios.

```typescript
interface ParetoPoint {
  id: string;
  label: string;
  cost: number;
  service: number;
  isParetoOptimal: boolean;
  isRecommended: boolean;
}

interface ParetoChartProps extends React.HTMLAttributes<HTMLDivElement> {
  points: ParetoPoint[];
  onPointClick?: (point: ParetoPoint) => void;
}
```

```tsx
<ParetoChart
  points={scenarioOptions.map((opt) => ({
    id: opt.id,
    label: opt.label,
    cost: opt.coutTotalEur,
    service: opt.serviceAttenduPct,
    isParetoOptimal: opt.isParetoOptimal,
    isRecommended: opt.isRecommended,
  }))}
  onPointClick={(pt) => selectScenario(pt.id)}
/>
```

Les points Pareto-optimaux sont relies par une ligne en pointilles ambre. Le point recommande est entoure d'un anneau colore. Tooltip au hover.

---

### Formulaires

#### Input

Champ de saisie avec support d'erreur, addon gauche/droit.

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}
```

```tsx
<Input
  placeholder="Rechercher..."
  leftAddon={<SearchIcon className="h-4 w-4" />}
/>
<Input type="email" error={!!errors.email} />
```

---

#### Label

Label de formulaire avec indicateur de champ obligatoire.

```typescript
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}
```

```tsx
<Label htmlFor="email" required>
  Adresse email
</Label>
```

---

#### Checkbox

Checkbox avec support de l'etat indeterminate (pour "tout selectionner" dans DataTable).

```typescript
interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}
```

```tsx
<Checkbox
  checked={isSelected}
  onChange={(checked) => toggleSelection(id, checked)}
  aria-label="Selectionner cette ligne"
/>
```

---

#### FormField

Conteneur de champ de formulaire avec label, hint, message d'erreur et accessibilite (aria-describedby).

```typescript
interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}
```

```tsx
<FormField label="Nom du site" htmlFor="site-name" required error={errors.name}>
  <Input
    id="site-name"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
</FormField>
```

---

#### DateRangePicker

Selecteur de plage de dates avec deux inputs natifs de type `date`.

```typescript
interface DateRange {
  from: string; // format ISO "YYYY-MM-DD"
  to: string;
}

interface DateRangePickerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  value: DateRange;
  onChange: (range: DateRange) => void;
  minDate?: string;
  maxDate?: string;
}
```

```tsx
<DateRangePicker
  value={period}
  onChange={setPeriod}
  minDate="2025-01-01"
  maxDate="2026-12-31"
/>
```

Ajuste automatiquement `from`/`to` pour eviter les plages inversees.

---

#### SelectDropdown

Select natif style avec chevron, label optionnel et placeholder.

```typescript
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectDropdownProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}
```

```tsx
<SelectDropdown
  label="Horizon"
  options={[
    { value: "j3", label: "J+3" },
    { value: "j7", label: "J+7" },
    { value: "j14", label: "J+14" },
  ]}
  value={horizon}
  onChange={setHorizon}
  placeholder="Choisir un horizon"
/>
```

---

### Feedback

#### Alert, AlertTitle, AlertDescription

Bandeau d'alerte avec variantes semantiques.

```typescript
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning" | "info";
}
```

```tsx
<Alert variant="warning">
  <AlertTitle>Couverture insuffisante</AlertTitle>
  <AlertDescription>
    Le site Lyon-Nord presente un deficit de 12h sur le shift AM de demain.
  </AlertDescription>
</Alert>
```

Supporte une icone SVG en enfant direct (positionnee en `absolute left-4`).

---

#### Spinner

Indicateur de chargement anime avec trois tailles.

```typescript
interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"; // sm=16px, md=32px, lg=48px
}
```

```tsx
<Spinner size="lg" />
```

Inclut un `<span className="sr-only">` pour l'accessibilite.

---

#### Skeleton, SkeletonCard, SkeletonTable, SkeletonChart

Placeholders de chargement animes (`animate-shimmer`), chacun reproduisant la mise en page du composant reel correspondant.

```typescript
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
}

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {}

interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number; // defaut: 5
  columns?: number; // defaut: 4
}

interface SkeletonChartProps extends React.HTMLAttributes<HTMLDivElement> {}
```

```tsx
{isLoading ? <SkeletonCard /> : <StatCard value="87%" label="Couverture" />}
{isLoading ? <SkeletonTable rows={10} columns={5} /> : <DataTable ... />}
{isLoading ? <SkeletonChart /> : <WaterfallChart ... />}
```

---

### Divers

#### Avatar, AvatarImage, AvatarFallback

Composant d'avatar circulaire avec image et fallback textuel.

```tsx
<Avatar>
  <AvatarImage src="/photos/dupont.jpg" alt="Jean Dupont" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

Tous les sous-composants acceptent `className`. Taille par defaut : `h-10 w-10`.

---

#### TabBar

Barre d'onglets en style pill avec compteur optionnel.

```typescript
interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}
```

```tsx
<TabBar
  tabs={[
    { id: "alertes", label: "Alertes", count: 5 },
    { id: "previsions", label: "Previsions" },
    { id: "decisions", label: "Decisions", count: 2 },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

L'onglet actif a un fond `amber-500` avec texte blanc.

---

## Utilitaires

### `cn()` -- fusion de classes Tailwind

Combine `clsx` (resolution conditionnelle) et `tailwind-merge` (resolution des conflits Tailwind).

```typescript
import { cn } from "@praedixa/ui";

cn("px-4 py-2", isActive && "bg-amber-500", className);
// tailwind-merge resout les conflits : cn("px-4", "px-8") => "px-8"
```

### `useMediaQuery()` -- hook responsive

Hook client (`"use client"`) qui ecoute un media query CSS.

```typescript
import { useMediaQuery, breakpoints } from "@praedixa/ui";

function MyComponent() {
  const isDesktop = useMediaQuery(breakpoints.lg); // "(min-width: 1024px)"
  const isMobile = useMediaQuery("(max-width: 639px)");
  // ...
}
```

Breakpoints pre-definis (alignes sur Tailwind) :

| Cle   | Query                 |
| ----- | --------------------- |
| `sm`  | `(min-width: 640px)`  |
| `md`  | `(min-width: 768px)`  |
| `lg`  | `(min-width: 1024px)` |
| `xl`  | `(min-width: 1280px)` |
| `2xl` | `(min-width: 1536px)` |

---

## Design system

Le design system Praedixa repose sur les conventions suivantes :

| Token                 | Valeur            | Usage                                      |
| --------------------- | ----------------- | ------------------------------------------ |
| Espace colorimetrique | OKLCH             | Toutes les couleurs Tailwind               |
| Couleur primaire      | amber-500         | Boutons, onglets actifs, focus rings       |
| Fond sidebar (webapp) | charcoal          | Barre laterale sombre                      |
| Font sans             | Plus Jakarta Sans | Corps de texte, labels                     |
| Font serif            | DM Serif Display  | Titres h2 (`font-serif`), valeurs StatCard |
| `shadow-soft`         | Ombre legere      | Etat de repos des cartes                   |
| `shadow-card`         | Ombre moyenne     | Hover sur les cartes                       |
| `shadow-glow`         | Halo ambre        | Mise en evidence                           |
| `rounded-2xl`         | 1rem              | Cartes, tableaux                           |
| `rounded-lg`          | 0.5rem            | Boutons                                    |

**Limitation `@apply` + OKLCH** : les modificateurs d'opacite (`bg-amber-500/50`) ne fonctionnent pas avec `@apply` dans Tailwind 3.4 quand la couleur est definie en OKLCH. Utiliser du CSS brut a la place.

---

## Pieges courants

| Composant      | Piege                                                       | Solution                                                                |
| -------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| **DataTable**  | La propriete s'appelle `label`, pas `header`                | `{ key: "x", label: "Mon label" }`                                      |
| **StatCard**   | `value` est un `string`, pas un `number`                    | `value={String(42)}`                                                    |
| **StatCard**   | La propriete s'appelle `label`, pas `title`                 | `label="Mon KPI"`                                                       |
| **StatCard**   | `icon` attend un element JSX, pas un composant              | `icon={<MyIcon />}` et non `icon={MyIcon}`                              |
| **DetailCard** | `padding` n'accepte que 3 valeurs                           | `"compact"`, `"default"`, `"loose"` -- utiliser `className="p-0"` sinon |
| **Build**      | Le build de `ui` depend de `shared-types`                   | Toujours builder dans l'ordre : `shared-types` -> `ui` -> apps          |
| **Typecheck**  | `pnpm typecheck` echoue si les packages ne sont pas buildes | Lancer `pnpm build` d'abord                                             |
| **OKLCH**      | `@apply` + opacite ne fonctionne pas                        | Utiliser du CSS brut pour les modificateurs d'opacite                   |

---

## Tests

Les tests sont ecrits avec **Vitest** et co-localises dans des dossiers `__tests__/` a cote des composants.

```bash
# Lancer les tests du package ui
pnpm --filter @praedixa/ui test

# Watch mode
pnpm --filter @praedixa/ui test:watch
```

Couverture a 100% imposee par la CI. Le fichier `testing/vitest.setup.ts` (racine du monorepo) fournit les mocks globaux : `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `crypto.randomUUID`.
