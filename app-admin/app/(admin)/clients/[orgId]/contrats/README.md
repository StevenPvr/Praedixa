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
- `contract-studio-detail-column.tsx`: detail courant, checklist et audit
- `contract-studio-create-panel.tsx`: creation de draft depuis un template
- `contract-studio-create-controller.ts`: orchestration du draft initial depuis le template catalogue
- `contract-studio-mutation-panel.tsx`: transitions, fork et rollback
- `contract-studio-mutation-controller.ts`: orchestration des mutations, validation du motif et resynchronisation de la selection
- `contract-studio-shared.ts`: helpers et types de selection partages

Les composants du dossier suivent maintenant les memes conventions Sonar que `config/`:

- props de composants explicites en `Readonly<...>` y compris pour les composants internes;
- annotations inline a base de `ReturnType<...>` remplacees par des alias de props dedies quand elles touchent des composants React;
- fragments courts et JSX ambigus remplaces par des conteneurs explicites quand cela aide l'analyse statique;
- `className` conditionnels derives dans des variables avant le `return` pour eviter les faux positifs JSX;
- helpers de normalisation texte bases sur `replaceAll(...)` quand le remplacement global est voulu.

## Source de verite

- les donnees viennent des endpoints admin `decision-contracts`
- le catalogue de creation vient des endpoints globaux `decision-contract-templates`
- les mutations restent conditionnees a `admin:org:write`

## Tests

- `__tests__/page.test.tsx`
