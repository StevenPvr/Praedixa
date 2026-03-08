# `components/blog/`

Composants UI du blog marketing.

## Elements

- `BlogIndexPage.tsx`: page de listing
- `BlogPostCard.tsx`: carte reutilisable dans les listes
- `BlogPostPage.tsx`: rendu detail d'un post

## Dependances clefs

- `lib/blog/posts.ts`: lecture, pagination, siblings
- `lib/blog/mdx.tsx`: rendu du corps MDX
- `lib/blog/types.ts`: contrats des posts
- `lib/seo/*`: metadata des pages blog

## Convention

La logique de lecture disque, de frontmatter et de RSS doit rester dans `lib/blog/`; ce dossier ne doit contenir que la composition UI.
