# Action `minutes-guard`

Cette action composite encapsule le contrôle de budget/usage CI utilisé par les workflows GitHub.

## Fichier clé

- `action.yml` : définition complète des inputs, étapes et sorties de l'action.

## Quand la modifier

- Quand la politique d'exécution CI évolue.
- Quand un workflow consomme cette action avec de nouveaux paramètres.

## Point d'attention

- Toute modification doit être relue en parallèle des workflows qui l'appellent, sinon on peut créer des divergences silencieuses dans la CI.
