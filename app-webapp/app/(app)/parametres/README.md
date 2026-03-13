# `app/(app)/parametres/`

Route `/parametres`.

## Fichiers

| Fichier       | Role reel                                                                |
| ------------- | ------------------------------------------------------------------------ |
| `page.tsx`    | affiche le profil courant, les preferences UI et la configuration active |
| `loading.tsx` | etat de chargement de la route                                           |

## Comportements visibles

- le selecteur de langue lit `useI18n()` et reste desactive quand `preferencesSyncState` vaut `loading`, `saving` ou `unavailable`
- l'erreur de synchronisation des preferences est affichee inline, pas masquee derriere un fallback silencieux
- le choix `Alertes critiques uniquement` est local au navigateur via `localStorage`
- le bloc `Configuration active` lit `useDecisionConfig(selectedSiteId)` et affiche `Chargement`, l'erreur ou `Configuration indisponible` selon le cas
