# testing/performance

Checks de performance versionnes.

## Contenu

- `k6-smoke.js` est un smoke test simple prevu pour les validations locales ou CI avancee.

## Lancer k6

```bash
k6 run testing/performance/k6-smoke.js
```

## Integration repo

- Les seuils globaux de gate sont definis dans `scripts/gate.config.yaml`.
- Les scripts de release et de gate exhaustive peuvent s'appuyer sur ces checks; garder les scenarios ici rapides, deterministes et focalises sur des endpoints critiques.
