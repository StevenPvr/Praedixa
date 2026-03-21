# `lib/blog/`

Moteur de blog du landing.

## Responsabilites

- localiser le dossier de contenu et lire les fichiers MDX
- parser et valider le frontmatter
- calculer reading time et filtrer les drafts
- construire les paths blog et le flux RSS
- injecter les liens internes automatiques dans le contenu

## Fichiers clefs

- `config.ts`: conventions blog et resolution du dossier contenu
- `posts.ts`: lecture disque, cache memo en production, pagination, sibling posts
- `mdx.tsx`: rendu MDX
- `internal-links.ts` et `internal-links-hast.ts`: autolinking interne
- `rss.ts`: generation du flux RSS
- `types.ts`: contrats de frontmatter et de posts

## Conventions editoriales

- le nom de fichier est le slug canonique
- le frontmatter est strictement valide
- les drafts ne doivent pas sortir en prod
- un meme slug peut exister en FR et EN
- les champs editoriaux optionnels `answerSummary`, `keyPoints` et `sources` servent a sortir des articles plus facilement citables par les moteurs generatifs sans dupliquer une autre promesse que celle de l'article

## Tests

- `__tests__/posts.test.ts`
- `__tests__/internal-links.test.ts`
