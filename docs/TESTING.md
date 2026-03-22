# Guide de tests -- Praedixa

Ce document decrit la strategie de test, les outils et les conventions du projet. Tout contributeur doit lire ce guide avant d'ecrire ou de modifier des tests.

## 1. Philosophie de test

Praedixa applique une politique de **couverture a 100 %** sur le backend (Pytest) et le frontend (Vitest). Aucune exception n'est toleree. Les tests suivent une approche **defense-in-depth** :

| Niveau      | Outil           | Objectif                                                       |
| ----------- | --------------- | -------------------------------------------------------------- |
| Unit        | Pytest / Vitest | Valider chaque service, schema, composant en isolation         |
| Integration | Pytest (ASGI)   | Verifier le flux router -> service -> DB (mock)                |
| Securite    | Pytest          | Prouver l'isolation tenant, le controle d'acces, la validation |
| E2E         | Playwright      | Valider les parcours utilisateurs dans le navigateur           |

Les tests sont des **citoyens de premiere classe**. Chaque merge request doit atteindre 100 % de couverture.

## 2. Inventaire des tests

| Categorie                            | Outil      | Approx. | Emplacement                           |
| ------------------------------------ | ---------- | ------- | ------------------------------------- |
| Backend unit                         | Pytest     | ~1 500  | `app-api/tests/unit/`                 |
| Backend integration                  | Pytest     | ~1 200  | `app-api/tests/integration/`          |
| Backend securite                     | Pytest     | ~670    | `app-api/tests/security/`             |
| Frontend (landing, webapp, packages) | Vitest     | ~1 800  | `app-*/.../__tests__/`                |
| Frontend (admin)                     | Vitest     | ~420    | `app-admin/.../__tests__/`            |
| E2E                                  | Playwright | ~180    | `testing/e2e/{landing,webapp,admin}/` |

**Total** : ~3 370 Pytest + ~2 220 Vitest + ~180 Playwright.

## 3. Backend -- Pytest

### Configuration

Dans `app-api/pyproject.toml` :

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"             # pas besoin de @pytest.mark.asyncio
testpaths = ["tests"]
addopts = "--cov=app --cov-report=term-missing --cov-fail-under=100"

[tool.coverage.report]
fail_under = 100
exclude_lines = ["pragma: no cover", "if TYPE_CHECKING:", "pass", "def __repr__"]
```

### Commandes

```bash
cd app-api && uv run pytest                                  # Tous les tests
cd app-api && uv run pytest tests/unit/test_services_forecasts.py  # Un fichier
cd app-api && uv run pytest -k "test_returns_items_and_total"      # Par nom
cd app-api && uv run pytest --no-cov                               # Sans couverture
cd app-api && uv run pytest tests/security/                        # Securite seule
```

### Hierarchie des conftest

```
app-api/tests/
  conftest.py             # Fixture `client` (ASGI basique)
  unit/conftest.py        # Mock helpers : make_mock_session, make_scalar_result, etc.
  integration/conftest.py # Fixtures client_a / client_b (deux tenants)
  security/               # Pas de conftest -- chaque fichier definit ses fixtures
```

### Tests unitaires (`tests/unit/`)

**Pattern de mock : SimpleNamespace (pas MagicMock).** Pydantic `model_validate(obj, from_attributes=True)` accede aux attributs de l'objet. `MagicMock` renvoie un `Mock` pour chaque attribut, ce qui casse la validation :

```python
# DO : SimpleNamespace pour les objets ORM
org = SimpleNamespace(id=uuid.uuid4(), name="Test Org", slug="test-org",
                      status="active", created_at=datetime.now(UTC), updated_at=datetime.now(UTC))
# DON'T : MagicMock casse model_validate
org = MagicMock(spec=Organization)
```

**Helpers de mock** (`tests/unit/conftest.py`) :

| Helper                        | Usage                                                       |
| ----------------------------- | ----------------------------------------------------------- |
| `make_mock_session(*results)` | `AsyncMock` session avec `execute()`, `flush()`, `commit()` |
| `make_scalar_result(value)`   | Resultat de `scalar_one_or_none()`                          |
| `make_scalars_result(values)` | Resultat de `scalars().all()`                               |
| `make_all_result(rows)`       | Resultat de `.all()`                                        |

**Piege UUID SQLAlchemy** : `default=uuid.uuid4` n'assigne l'UUID qu'apres `INSERT RETURNING`. Mocker `session.flush` pour assigner :

```python
async def assign_id(*_a, **_kw):
    session.add.call_args[0][0].id = uuid.uuid4()
session.flush.side_effect = assign_id
```

**Exemple reel** (extrait de `app-api/tests/unit/test_services_forecasts.py`) :

```python
class TestListForecasts:
    async def test_returns_items_and_total(self) -> None:
        tenant = TenantFilter("org-1")
        items = [SimpleNamespace(id=uuid.uuid4()), SimpleNamespace(id=uuid.uuid4())]
        session = make_mock_session(
            make_scalar_result(2),       # count query
            make_scalars_result(items),  # items query
        )
        result_items, total = await list_forecasts(tenant, session)
        assert total == 2
        assert len(result_items) == 2
```

### Tests d'integration (`tests/integration/`)

Requetes HTTP reelles via `httpx.AsyncClient` + `ASGITransport`, dependances FastAPI overridees. Deux tenants isoles (ORG_A / ORG_B) :

```python
# app-api/tests/integration/conftest.py
@pytest.fixture
async def client_a(mock_session):
    app.dependency_overrides[get_db_session] = lambda: mock_session
    app.dependency_overrides[get_current_user] = lambda: JWT_A
    app.dependency_overrides[get_tenant_filter] = lambda: TenantFilter(str(ORG_A_ID))
    app.dependency_overrides[get_site_filter] = lambda: SiteFilter(None)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

**Exemple reel** (extrait de `app-api/tests/integration/test_organizations.py`) :

```python
async def test_get_organization_me_200(client_a: AsyncClient) -> None:
    org = make_mock_org()
    with patch("app.routers.organizations.get_organization",
               new_callable=AsyncMock, return_value=org):
        response = await client_a.get("/api/v1/organizations/me")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Test Org"

async def test_get_organization_me_401_no_auth(unauth_client: AsyncClient) -> None:
    response = await unauth_client.get("/api/v1/organizations/me")
    assert response.status_code == 401
```

### Tests de securite (`tests/security/`)

Trois categories :

| Categorie          | Exemples                                                  |
| ------------------ | --------------------------------------------------------- |
| Isolation tenant   | `test_tenant_isolation.py`, `test_decisions_isolation.py` |
| Auth / roles       | `test_auth_jwt.py`, `test_admin_role_escalation.py`       |
| Validation entrees | `test_ddl_validation.py`, `test_yaml_validation.py`       |

**Principe d'invisibilite** : les donnees cross-tenant doivent renvoyer `404` ou une liste vide (pas `403` qui confirme l'existence de la ressource).

**Exemple reel** (extrait de `app-api/tests/security/test_tenant_isolation.py`) :

```python
class TestTenantFilterUnit:
    def test_apply_adds_where_clause(self) -> None:
        tf = TenantFilter(str(ORG_A_ID))
        filtered = tf.apply(select(Site), Site)
        assert filtered.whereclause is not None
        assert "organization_id" in str(filtered.compile())

    def test_filter_preserves_existing_where(self) -> None:
        tf = TenantFilter(str(ORG_A_ID))
        filtered = tf.apply(select(Site).where(Site.name == "test"), Site)
        compiled = str(filtered.compile())
        assert "organization_id" in compiled
        assert "name" in compiled
```

### Rate limiting

slowapi leve des 429 en test. Toujours desactiver :

```python
@pytest.fixture(autouse=True)
def disable_rate_limit():
    limiter.enabled = False
    yield
    limiter.enabled = True
```

## 4. Frontend -- Vitest

### Configuration

- **Racine** (`vitest.config.ts`) : environnement `jsdom`, setup `testing/vitest.setup.ts`, deux projets (`default` + `admin`), couverture V8 a 100 %
- **Admin** (`app-admin/vitest.config.ts`) : workspace separe car alias `@` different

### Mocks globaux (`testing/vitest.setup.ts`)

| Mock                   | Raison                     |
| ---------------------- | -------------------------- |
| `window.matchMedia`    | Composants responsive      |
| `ResizeObserver`       | Tremor, layout             |
| `IntersectionObserver` | ScrollReveal, lazy loading |
| `crypto.randomUUID`    | Absent dans jsdom          |

### Commandes

```bash
pnpm test                           # Suite racine + tous les workspaces critiques
pnpm vitest run path/to/file.test.tsx  # Un fichier
pnpm vitest run -t "test name"      # Par nom
pnpm test:watch                     # Mode watch
pnpm test:coverage                  # Couverture racine + tests workspace
```

### Utilitaires de mock (`testing/utils/`)

| Fichier                          | Usage                                                                    |
| -------------------------------- | ------------------------------------------------------------------------ |
| `render.tsx`                     | Wrapper `@testing-library/react` avec `screen`, `fireEvent`, `userEvent` |
| `mocks/next-navigation.ts`       | Mock useRouter, usePathname, useSearchParams                             |
| `mocks/next-headers.ts`          | Mock cookies() et headers()                                              |
| `mocks/framer-motion.ts`         | Proxy motion -> elements HTML natifs                                     |
| `mocks/intersection-observer.ts` | IntersectionObserver controllable                                        |
| `mocks/resend.ts`                | Mock SDK Resend                                                          |
| `mocks/next-server.ts`           | Mock NextRequest/NextResponse                                            |

### Exemple reel

Extrait de `app-landing/components/sections/__tests__/HeroSection.test.tsx` :

```tsx
vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { HeroSection } from "../HeroSection";
import { heroContent } from "../../../lib/content/hero-content";

describe("HeroSection", () => {
  it("should render the headline", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain(heroContent.headlineHighlight);
  });
});
```

Les tests vivent dans un dossier `__tests__/` adjacent au code source (ex: `components/__tests__/MyComponent.test.tsx`).

## 5. E2E -- Playwright

### Configuration (`playwright.config.ts`)

| Projet    | Port | Tests                  |
| --------- | ---- | ---------------------- |
| `landing` | 3000 | `testing/e2e/landing/` |
| `webapp`  | 3001 | `testing/e2e/webapp/`  |
| `admin`   | 3002 | `testing/e2e/admin/`   |

Playwright demarre automatiquement 3 serveurs applicatifs : landing (`3000`), webapp (`3001`) et admin (`3002`).
Les variables d'environnement OIDC de test sont injectees par projet dans `playwright.config.ts` (`AUTH_OIDC_ISSUER_URL`, `AUTH_OIDC_CLIENT_ID`, `AUTH_SESSION_SECRET`).

### Auth E2E

Les parcours authentifies reposent sur des cookies OIDC signes (pas de login UI dans les tests proteges) :

1. **Helper commun** (`testing/e2e/fixtures/oidc-auth.ts`) : genere un access token de test + un cookie de session signe (HMAC SHA-256) pour webapp/admin.
2. **Fixture webapp** (`testing/e2e/webapp/fixtures/auth.ts`) : `setupAuth(page, { role, organizationId, siteId })` pour les scenarios client (`org_admin`, `manager`, etc.).
3. **Fixture admin** (`testing/e2e/admin/fixtures/auth.ts`) : `setupAdminAuth(page)` pour les scenarios `super_admin`.

Les scénarios E2E authentifiés reposent désormais sur les helpers OIDC de `testing/e2e/fixtures/oidc-auth.ts` et `testing/e2e/fixtures/oidc-config.ts`.

### Couverture V8

Avec `COVERAGE=1`, la fixture `testing/e2e/fixtures/coverage.ts` collecte la couverture via `page.coverage` (Chromium) et genere un rapport `monocart-reporter`. Importer `test` depuis `./fixtures/coverage` au lieu de `@playwright/test`.

### Commandes

```bash
pnpm test:e2e           # Tous les E2E
pnpm test:e2e:landing   # Landing seul
pnpm test:e2e:webapp    # Webapp seul
pnpm test:e2e:admin     # Admin seul
pnpm test:e2e:smoke     # Smoke cross-app webapp + admin versionne
pnpm test:e2e:coverage  # Avec couverture V8
node --test scripts/__tests__/synthetic-monitoring-baseline.test.mjs  # Baseline synthetics versionnee
```

### Smoke et synthetics versionnes

Les E2E ne remplacent pas les verifications de release et d'exploitation versionnees dans `scripts/`:

- `./scripts/scw/scw-post-deploy-smoke.sh` est le smoke CLI canonique apres deploy ou rollback pour `api`, `webapp`, `admin`, `auth`, `landing` et `connectors` selon les URLs disponibles;
- `./scripts/validate-synthetic-monitoring-baseline.mjs` valide la baseline machine-readable `docs/runbooks/synthetic-monitoring-baseline.json`, utilisee comme source de verite pour les checks synthetiques critiques.

Ces checks doivent rester coherents avec `docs/runbooks/observability-baseline.md`, `docs/runbooks/post-deploy-smoke-baseline.md` et `docs/runbooks/release-and-rollback-baseline.md`.

### Exemple reel

Extrait de `testing/e2e/webapp/dashboard.spec.ts` :

```typescript
test.describe("Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays KPI stat cards", async ({ page }) => {
    await page.goto("/dashboard");
    const kpiSection = page.getByLabel("Indicateurs cles");
    await expect(kpiSection).toBeVisible();
    await expect(kpiSection.getByText("87.3%")).toBeVisible();
  });
});
```

## 6. Pieges courants

| Piege                     | Solution                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Build avant typecheck** | `pnpm build` puis `pnpm typecheck` (les apps importent les packages compiles)                                    |
| **UUID SQLAlchemy**       | `default=uuid.uuid4` assigne au INSERT, pas a l'init -- mocker `session.flush`                                   |
| **Alembic PG ENUM**       | Utiliser `PG_ENUM(name=..., create_type=False)` + SQL brut, pas `sa.Enum(create_type=False)`                     |
| **slowapi 429**           | `limiter.enabled = False` dans les fixtures                                                                      |
| **ESLint + test mocks**   | `next build` lint les tests -- ajouter `/* eslint-disable */` si necessaire                                      |
| **`@apply` + oklch**      | Ne fonctionne pas dans Tailwind 3.4 -- utiliser du CSS brut                                                      |
| **Migrations paralleles** | Verifier `./scripts/check-alembic-heads.sh` (ou `alembic heads`) apres travail parallele et corriger les chaines |

## 7. Ajouter de nouveaux tests

### Test unitaire backend

Fichier dans `app-api/tests/unit/test_{module}.py`. Importer les helpers depuis `tests.unit.conftest`. Utiliser `SimpleNamespace` pour les objets ORM. Classes `TestNomDuService`, methodes `test_<comportement>`.

```python
class TestMyService:
    async def test_happy_path(self) -> None:
        session = make_mock_session(make_scalar_result(expected))
        result = await my_service_function(tenant, session)
        assert result == expected
```

### Test d'integration backend

Fichier dans `app-api/tests/integration/test_{router}.py`. Utiliser les fixtures `client_a`, `client_b`, `unauth_client`. Patcher au niveau du router.

```python
async def test_endpoint_200(client_a: AsyncClient) -> None:
    with patch("app.routers.my_module.my_service",
               new_callable=AsyncMock, return_value=data):
        response = await client_a.get("/api/v1/my-endpoint")
    assert response.status_code == 200
```

### Test de securite backend

Fichier dans `app-api/tests/security/test_{aspect}.py`. Definir deux orgs, deux JWT, deux clients. Verifier l'**invisibilite** (200 vide ou 404), pas juste l'inaccessibilite (403).

### Test Vitest frontend

Fichier dans `{app}/components/__tests__/MyComponent.test.tsx`. Les `vi.mock()` **avant** les imports. Utiliser les mocks de `testing/utils/mocks/`.

```tsx
vi.mock("next/navigation", async () => {
  const { createNextNavigationMock } =
    await import("../../../../testing/utils/mocks/next-navigation");
  return createNextNavigationMock();
});
import { MyComponent } from "../MyComponent";
```

### Test E2E Playwright

Fichier dans `testing/e2e/{project}/my-feature.spec.ts`. Importer `test` depuis `./fixtures/coverage`. Appeler `setupAuth(page)` (webapp) ou `setupAdminAuth(page)` (admin) avant toute navigation protegee. Le landing n'a pas besoin d'auth.

## 8. Gate officiel (Go/No-Go)

Le gate officiel est le gate local exhaustif:

```bash
pnpm gate:exhaustive
```

Pour verification pre-push:

```bash
pnpm gate:prepush
```

Tests de regression securite cibles utilises aussi par les hooks:

```bash
./scripts/gates/gate-sensitive-security-tests.sh
```

Ce gate impose:

- checks qualite + securite exhaustifs
- tests unitaires/integration/backend
- e2e critiques frontends
- audits SAST/SCA/IaC/secrets
- perf/a11y/schema markup

Le runbook detaille (ordre, preuves, decision Go/No-Go) est dans:
`docs/runbooks/mvp-go-live-readiness.md` et `docs/runbooks/local-gate-exhaustive.md`.

---

**Voir aussi** : `CLAUDE.md` (conventions, gotchas), `app-api/pyproject.toml` (config Pytest), `vitest.config.ts` (config Vitest), `playwright.config.ts` (config Playwright), `testing/` (setup, mocks, E2E).
