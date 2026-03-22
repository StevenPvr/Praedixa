# Content (Praedixa)

Ce dossier contient le contenu "source of truth" utilise par la landing: articles MDX, maillage interne automatise et conventions editoriales.

## Role dans le repo

- Source de contenu pour `app-landing`.
- Point d'entree pour les workflows SEO, GEO/AEO et blog.
- Zone strictement editoriale: ne pas y deplacer de logique applicative.

## Workflow courant

Depuis la racine:

```bash
pnpm --filter @praedixa/landing lint
pnpm --filter @praedixa/landing build
pnpm --filter @praedixa/landing blog:audit-links
```

Verifier aussi les pages impactees avec les specs Playwright landing quand un article, un lien interne ou un template change.

## Structure

- `marketing/content/blog/` : articles MDX publiés sur `/{locale}/blog` (voir `marketing/content/blog/README.md`).
- `marketing/content/internal-links.json` : injection de liens contextuels (auto-linking).

## GEO / AEO (moteurs de réponse IA)

Objectif: ne plus optimiser uniquement pour les "10 liens bleus", mais pour être **cité** et **recommandé** par les moteurs de réponse (IA).

### Pilier 1 — Structurez pour les lecteurs pressés (Answer First)

- Réponse complète dès la 1ère phrase, puis détails ensuite.
- Sous-titres en questions conversationnelles (H2/H3), suivies d’une réponse immédiate.
- Ajoutez une FAQ en bas de page (Q/R réelles).
- Ajoutez des preuves: données originales, mini-cas, templates, citations sourcées (ne pas inventer de chiffres).

### Pilier 2 — Rendez le contenu lisible par les robots

- Vérifiez que les bots IA utiles ne sont pas bloqués dans `robots.txt` (selon votre stratégie).
- Gardez le contenu clé lisible en HTML rendu (SSR/SSG), évitez de le cacher derrière du JS lourd.
- Ajoutez du schema markup quand c’est pertinent (Article, FAQPage, etc.).
- Transcrivez les vidéos / podcasts en texte.

### Pilier 3 — Construisez votre autorité hors de votre site

- L’IA cherche un consensus: comparatifs, listicles, références externes.
- Intervenez de manière utile (pas autopromo) dans les communautés où votre ICP pose des questions.
- Ne sous-estimez pas la vidéo (YouTube) pour la découverte et la citation.

### Mesure — Part de Voix IA (AI Share of Voice)

- Définissez une liste de requêtes (comment / meilleur / comparatif / prix / alternative).
- Mesurez hebdo votre présence dans 2–3 moteurs (citations + liens).
- Suivez: citations / total citations (vs concurrents) + qualité des sessions issues de référents IA.
