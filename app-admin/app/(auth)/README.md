# `app/(auth)/` - UI publique du login admin

Ce groupe contient l'interface publique de connexion de l'admin. Comme pour le webapp, la logique d'authentification serveur reside dans [`../auth/`](../auth/README.md), pas dans cette UI.

## Contenu

| Fichier | Role |
| --- | --- |
| `layout.tsx` | Layout simple pour la page de login |
| `login/page.tsx` | Ecran `/login` reserve a l'entree super-admin |
| `login/__tests__/page.test.tsx` | Validation du rendu et des messages |
