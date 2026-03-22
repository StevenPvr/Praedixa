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
`BlogIndexPage.tsx` doit rester une vraie page pilier GEO: breadcrumb visible, resume canonique court et `WebPage`/`BreadcrumbList` JSON-LD coherents sur le hub principal.
`BlogPostPage.tsx` doit garder le meme niveau d'exigence: breadcrumb visible, bloc `answer-first` derive du post lui-meme et `BlogPosting`/`BreadcrumbList` relies au site et a l'organisation canoniques.
Quand un post fournit `answerSummary`, `keyPoints` ou `sources` via le frontmatter, la page detail doit les privilegier sur les fallbacks derives du corps MDX.
Le shell blog rend deja le `title` du post en `H1`; le pipeline MDX demote tout `h1` residuel du corps pour garder une seule tete de page SEO.
