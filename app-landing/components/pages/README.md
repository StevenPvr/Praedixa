# `components/pages/`

Composants orientes pages ou parcours metier.

## Ce qu'on trouve ici

- pages legal/corporate: `LegalStaticPage.tsx`
- pages resources/knowledge: `KnowledgePage.tsx`, `SerpResourcePage.tsx`
- page services: `ServicesPage.tsx`
- parcours contact: `ContactPageClient.tsx`, `ContactPageForm.tsx`, `ContactPageAside.tsx`, `ContactPageSuccessState.tsx`
- parcours pilote: `PilotApplicationPageClient.tsx`, `PilotApplicationForm.tsx`, `PilotApplicationAside.tsx`, `PilotApplicationStates.tsx`
- helpers/types de formulaire: `contact-page.*`, `pilot-application.*`

## Regle de decoupage

- `*PageClient.tsx`: orchestration client, soumission, transitions d'etat
- `*Form.tsx`: champs et ergonomie du formulaire
- `*Aside.tsx`: contenu lateral, reassurance, preuves
- `*State*`: succes / empty / etats derives
- `*.helpers.ts` et `*.types.ts`: transformations et contrats locaux

## APIs locales consommees

- contact -> `POST /api/contact`
- candidature pilote -> `POST /api/pilot-application`
- les copies de select/options viennent de `lib/content/pilot-form-options.ts`

## Conventions

- laisser les validations serveur dans `lib/api/*`; garder ici seulement la logique d'UI
- ne pas dupliquer les listes d'options si elles existent deja dans `lib/content`
- les pages knowledge doivent lire le contenu depuis `lib/content/knowledge-pages*.ts`
