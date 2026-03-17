# Lessons

- Quand l'utilisateur demande de "continuer le PRD" ou de "terminer le TODO", produire directement les artefacts de fermeture manquants et les brancher au `TODO`, au lieu de s'arreter a des docs de cadrage meta ou a une simple recommandation.
- Sur un chantier monorepo long avec plusieurs sections ouvertes du `TODO`, lancer tout de suite plusieurs agents en parallele pour cartographier les options de fermeture, au lieu de faire une exploration sequentielle trop lente.
- Quand un gate local long reste bloque sur une seule suite, remonter vite au user le blocage exact, l'etape suivante et l'horizon de cloture, au lieu d'attendre la fin complete du pipeline.
- Quand un script ops local a besoin d'un secret deja present dans les `.env.local` standard du repo, verifier et autocharger ces fichiers avant de demander a l'utilisateur de reexporter la variable a la main.
- Quand un utilisateur demande de supprimer des comptes fake/demo, ne pas s'arreter au fait de fermer le chemin de creation: inventorier et purger aussi les identites deja presentes en live, ou expliciter tout de suite le blocage restant.
- Quand l'utilisateur demande si "ca fonctionne", repondre d'abord depuis la realite de production; un flux seulement valide en local ou dans le worktree n'est pas une reponse suffisante.
