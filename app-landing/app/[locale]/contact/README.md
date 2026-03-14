# Contact

## Rôle

Ce dossier matérialise un segment de route Next.js. Les fichiers `page.tsx` définissent le rendu, le layout ou le handler HTTP de ce segment.

## Contenu immédiat

Sous-dossiers :

- Aucun élément versionné direct.

Fichiers :

- `page.tsx`

## Intégration

Ce dossier est consommé par l'application `app-landing` et s'insère dans son flux runtime, build ou test.

## Note de copy

La page contact est la porte d'entree commerciale unique pour qualifier soit un premier perimetre de decision, soit une preuve sur historique.
Le formulaire demande les champs utiles au tri commercial (`entreprise`, `fonction`, `nombre de sites`, `secteur`, `arbitrage principal`, `horizon projet`, `stack` optionnelle) et derive l'intention via `?intent=deploiement|deployment|historique|historical-proof`.
La page ne doit plus reintroduire `objet`, `sujet`, `diagnostic ROI gratuit`, ni une promesse generique de prise de contact sans qualification.
Comme page commerciale coeur, elle expose aussi une breadcrumb visible et un couple `WebPage` + `BreadcrumbList` JSON-LD coherents avec le reste des pages piliers.
