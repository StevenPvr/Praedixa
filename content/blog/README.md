# Comment écrire un article de blog (Praedixa)

Ce dossier contient les articles MDX publiés sur `/{locale}/blog`.

## 1) Convention de fichier

- Format: `kebab-case.mdx`
- Exemple: `planification-effectifs-retail.mdx`
- Le nom du fichier devient le `slug` d'URL.

## 2) Frontmatter obligatoire

```mdx
---
title: "Titre article"
description: "Resume SEO (150-160 caracteres idealement)"
date: "2026-03-01"
tags: ["workforce-planning", "roi", "ops"]
draft: false
canonical: "https://www.praedixa.com/fr/blog/mon-article" # optionnel
image: "/og-image.png" # optionnel
authors: ["Praedixa"] # optionnel
readingTime: 6 # optionnel, calcule automatiquement sinon
lang: "fr" # optionnel: fr | en (defaut: fr)
disableAutoLinks: false # optionnel
rssVersion: 1 # optionnel, incrementer pour forcer une republication RSS sans changer l'URL
---
```

## 3) Règles de slug

- Utiliser uniquement lettres minuscules, chiffres et tirets.
- Pas d'espaces, pas d'underscores, pas d'accents.

## 4) Ajouter une règle de lien interne automatique

Le fichier `content/internal-links.json` pilote l'injection de liens contextuels.

```json
{
  "id": "fr-pilot",
  "patterns": ["pilote fondateur", "pilote Praedixa"],
  "url": "/fr/devenir-pilote",
  "maxPerDoc": 1
}
```

Bonnes pratiques:

- Ne pas multiplier les patterns vagues.
- Garder `maxPerDoc` a `1` sauf besoin exceptionnel.
- Verifier que l'URL cible existe.

## 5) Checklist SEO avant publication

- [ ] `title` clair et specifique
- [ ] `description` utile et non dupliquee
- [ ] 1 CTA clair dans l'article
- [ ] 3 liens internes contextuels (auto ou manuels)
- [ ] Tags pertinents et coherents
- [ ] Pas de `draft: true` en production

## 6) Checklist GEO / AEO (moteurs de reponse IA)

Objectif: etre **cite** (pas seulement "ranker").

- [ ] Answer First: reponse complete des la 1ere phrase
- [ ] Titres en questions (conversationnelles) + reponse immediate sous le H2/H3
- [ ] FAQ en bas de page (Q/R reelles, pas marketing)
- [ ] Preuves: donnees originales / mini-etude / template / citations d'experts (sans chiffres inventes)
- [ ] Schema: `Article` + (optionnel) `FAQPage` si FAQ presente
- [ ] Lisibilite: contenu cle rendu en HTML (SSR/SSG), pas cache derriere JS lourd
- [ ] Robots: verifier que GPTBot / OAI-SearchBot / ClaudeBot ne sont pas bloques si vous voulez etre discoverable
- [ ] Mesure: suivre la "Part de Voix IA" (citations vs concurrents) sur un set de requetes

## 7) Vérifications locales

Depuis la racine du repo:

```bash
pnpm --filter @praedixa/landing lint
pnpm --filter @praedixa/landing build
pnpm --filter @praedixa/landing blog:audit-links
```
