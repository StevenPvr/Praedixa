# `lib/content/`

Contenu structure et versionne du landing hors dictionnaires UI.

## Zones majeures

- `knowledge-pages*.ts`: pages knowledge/piliers
- `serp-resources-fr*.ts`: ressources SEO FR publiees sous `/fr/ressources/[slug]`
- `serp-briefs-fr*.ts`: briefs SEO internes et derives
- `serp-asset-downloads.ts`: assets telechargeables lies aux ressources
- `legal.ts`: contenus legaux
- `pilot-form-options.ts`: options serveur/partagees pour le formulaire pilote

## Idee generale

Ici vivent les contenus longs, structures ou semi-editorialises que les pages consomment. On garde les donnees proches de leur domaine, pas dans les composants.

## Regles pratiques

- ajouter un nouveau contenu SEO dans les modules `serp-*` plutot que de coder en dur dans la page
- garder les cles partagees dans `knowledge-pages-shared.ts`
- si une page a besoin d'un contrat fort, exporter types + acces centralises depuis ce dossier

## Tests

- `__tests__/knowledge-pages-en.test.ts`
- `__tests__/knowledge-pages-fr.test.ts`
- `__tests__/serp-asset-downloads.test.ts`
- `__tests__/serp-briefs-fr.test.ts`
- `__tests__/serp-resources-fr.test.ts`
