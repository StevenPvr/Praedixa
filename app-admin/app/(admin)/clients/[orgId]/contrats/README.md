# `contrats/` - Contract Studio runtime

Cette page expose la gouvernance runtime des `DecisionContract` pour une organisation:

- liste des versions persistantes
- detail d'une version avec checklist de publish et audit recent
- creation d'un draft depuis un template
- transitions de lifecycle
- fork d'une version publiee
- rollback vers une version precedente sous forme de nouveau draft

## Structure locale

- `page.tsx`: orchestration des queries et de la selection
- `contract-studio-page-sections.tsx`: rendu des sections de lecture
- `contract-studio-detail-sections.tsx`: detail courant, checklist et audit
- `contract-studio-create-panel.tsx`: creation de draft depuis un template
- `contract-studio-mutation-panel.tsx`: transitions, fork et rollback
- `contract-studio-shared.ts`: helpers et types de selection partages

## Source de verite

- les donnees viennent des endpoints admin `decision-contracts`
- le catalogue de creation vient des endpoints globaux `decision-contract-templates`
- les mutations restent conditionnees a `admin:org:write`

## Tests

- `__tests__/page.test.tsx`
