# SEO KPI Dashboard Spec

## Objectif

Piloter la croissance organique avec un tableau de bord unique, actionnable
chaque semaine pour les equipes contenu, produit et marketing.

## Sources de donnees

- Google Search Console (queries, pages, CTR, position, indexation)
- GA4 (sessions organiques, conversions, parcours)
- Lighthouse CI / CrUX (CWV)
- Backlinks (Ahrefs/SEMrush ou equivalent)
- Logs edge (crawl bot, erreurs 4xx/5xx)

## KPIs principaux

1. Organic sessions (FR, EN, brand, non-brand)
2. Clicks, impressions, CTR, avg position (top 30 requetes)
3. Nombre de pages valides indexees
4. Pages en positions 4-10 (pipeline quick wins)
5. Conversions organiques par landing page
6. CWV field data:
   - LCP p75
   - INP p75
   - CLS p75
7. Domaines referents qualites (nouveaux / perdus)

## Segmentation obligatoire

- Locale: FR vs EN
- Type de page: Home / Pilier / Cluster / BOFU / Legal
- Intent: informationnel / comparatif / commercial / conversion

## Alertes

- Chute > 20% des clics sur une page P0 (7 jours glissants)
- Perte d'indexation d'une URL canonique P0
- Degradation CWV au-dessus des seuils cibles
- Augmentation anormale 4xx/5xx sur URLs crawlables

## Rituels

- Quotidien: verifications indexation + alertes critiques
- Hebdomadaire: priorisation pages 4-10 + refresh maillage
- Mensuel: revue thematic authority + roadmap contenus
