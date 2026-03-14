# `lib/`

Logique non-UI du site marketing.

## Sous-zones

- `api/`: services serveur pour les routes `app/api/*`
- `blog/`: lecture MDX, RSS, typage et internal linking
- `content/`: copy structuree, knowledge pages, ressources SEO, textes legaux
- `content/sector-pages.ts`: verticales marche avec preuves chiffrées et proposition de valeur par secteur
- `i18n/`: locales, slugs, dictionnaires, resolution de langue
- `media/`: selection de media hero
- `security/`: CSP, origine, rate limit, challenge anti-spam, audit
- `seo/`: metadata, entites SEO, breadcrumb schema
- `analytics/`: evenements analytics
- `animations/`: variants partages
- `config/`: config site
- `webgl/`: utilitaires detect GPU
- `utils.ts`, `nav-config.ts`: helpers transverses

## Principes

- `lib/` ne doit pas rendre de JSX sauf cas de moteur contenu clairement identifies (`blog/mdx.tsx`)
- les modules ici doivent etre reutilisables par plusieurs routes/composants
- la securite HTTP et les validations de payload vivent ici, pas dans les composants
- `nav-config.ts` porte la hierarchie publique du header; si la landing simplifie la navigation, realigner ce fichier sur le parcours voulu au lieu de laisser survivre une megamenu devenue trop lourde
- `nav-config.ts` doit exposer les verticales ICP via un seul dropdown `Secteurs`/`Industries` utile, avec routes exactes par secteur et sortie vers la page hub `resources/ressources`
