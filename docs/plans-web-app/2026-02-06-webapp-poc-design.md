# Praedixa Web App — POC Design

Date : 6 fevrier 2026
Statut : Valide (brainstorming)

---

## 1. Vision produit

Praedixa est un outil de **forecast de capacite globale** pour sites logistiques.
Il predit les desequilibres entre l'offre (humaine, materielle) et la demande
(commandes, flux) afin de permettre un arbitrage economique eclaire.

**Ce que Praedixa n'est PAS** : un gestionnaire de planning, un SIRH, un ERP.

### Positionnement

> Prevoir les trous. Chiffrer les options. Prouver le ROI.

### Secteur cible POC

Logistique / entreposage multi-sites.

### 2 dimensions du forecast POC

| Dimension              | Signal d'offre                                         | Signal de demande                        |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------- |
| **Capacite humaine**   | Effectifs disponibles, absences, turnover, competences | Volume de commandes, pics saisonniers    |
| **Volume marchandise** | Capacite de traitement/jour par site                   | Commandes a preparer, receptions prevues |

Le croisement des deux dimensions produit le **forecast de capacite** :
capacite disponible vs demande prevue = gap detecte ou non.

---

## 2. Utilisateurs

### Client pilote (multi-clients)

- **Profil** : Directeur d'exploitation, Responsable logistique, DAF
- **Age moyen** : 45-55 ans
- **Habitudes** : Excel, outils metier, pas d'appetence tech particuliere
- **Besoin** : lisibilite immediate, chiffres clairs, preuves pour le CODIR
- **Acces** : lecture seule sur les donnees, consultation des previsions/arbitrages, validation de decisions

### Admin (equipe Praedixa)

- **Role** : ingestion des donnees client, validation qualite, recalibrage modeles
- **Acces** : toutes les fonctionnalites client + upload donnees, gestion multi-clients

### Modele d'acces aux donnees

- Le client **ne peut pas uploader** de donnees dans la web app (POC)
- L'equipe Praedixa gere l'ingestion via le pipeline interne
- Le client peut **demander un refresh** de ses donnees (notification a l'equipe)
- Self-service a ouvrir post-POC, une fois les validations automatiques robustes

---

## 3. Architecture technique

### Vue d'ensemble

```
SYSTEME 1 : PIPELINE DATA (interne Praedixa, hors scope web app)
  Fichiers client --> ETL --> Training --> Inference
                                              |
                                              v
                                    DATA FOUNDATION
                                     (PostgreSQL)
                                         |
                                    READ ONLY
                                         |
SYSTEME 2 : WEB APP (ce qu'on construit)
  Next.js (frontend) --> FastAPI (API) --> Lit la Data Foundation
```

- La web app est une **couche de lecture** sur la Data Foundation
- L'inference ML est executee **en dehors** de la web app
- Les resultats (forecasts, scores, alertes, options d'arbitrage) sont pre-calcules
  et ecrits dans la Data Foundation par le pipeline
- **Seule ecriture de la web app** : decisions du client (validation d'arbitrage),
  preferences, parametres

### Stack technique

| Couche            | Technologie                     | Hebergement                  | Cout estime         |
| ----------------- | ------------------------------- | ---------------------------- | ------------------- |
| Landing page      | Next.js 15 (existant)           | Cloudflare Workers           | Gratuit             |
| Web App frontend  | Next.js 15 + Tremor + Tailwind  | Cloudflare Workers           | Gratuit             |
| API backend       | FastAPI + SQLAlchemy + Pydantic | Scaleway (France)            | ~7-15 EUR/mois      |
| Base de donnees   | PostgreSQL                      | Scaleway Managed DB (France) | ~7-15 EUR/mois      |
| Stockage fichiers | Uploads CSV/Excel               | Scaleway Object Storage      | ~1 EUR/mois         |
| Auth              | Supabase Auth                   | EU (Francfort)               | Gratuit (< 50k MAU) |
| Pipeline ML       | Python (hors scope web app)     | Scaleway                     | A determiner        |

### Structure monorepo

```
praedixa/
  apps/
    landing/           # Next.js -- Landing page (existant)
    webapp/            # Next.js -- Dashboard client (NOUVEAU)
    api/               # FastAPI -- Backend Python (NOUVEAU)
      app/
        main.py
        routers/       # API routes
        models/        # Pydantic models + SQLAlchemy ORM
        services/      # Business logic (lecture Data Foundation)
        core/          # Config, auth (verification JWT Supabase), DB connection
      tests/
      pyproject.toml
      Dockerfile
  packages/
    ui/                # Composants React partages (landing + webapp)
    shared-types/      # Types TypeScript partages
    api-client/        # Client API type (genere depuis OpenAPI spec) (NOUVEAU)
```

### Hebergement & souverainete

- **Donnees stockees en France** (Scaleway datacenter Paris)
- Argument commercial : zero transit de donnees hors de France
- Supabase Auth en EU (Francfort) -- seule exception, tokens JWT seulement
- Cloudflare Workers : CDN global, pas de donnees sensibles cote frontend

---

## 4. Authentification & securite

### Supabase Auth

- Gratuit jusqu'a 50 000 MAU
- Bcrypt, JWT signes, PKCE flow
- MFA/2FA activable a la demande (clients enterprise)
- Region EU (Francfort)

### Flux d'auth

1. L'utilisateur se connecte via Supabase Auth (frontend Next.js)
2. Supabase delivre un JWT signe
3. Le frontend envoie le JWT a FastAPI (`Authorization: Bearer ...`)
4. FastAPI verifie le JWT avec la cle publique Supabase
5. FastAPI extrait `user_id` + `organization_id` du token
6. Chaque requete DB est filtree par `organization_id` (isolation multi-tenant)

### Isolation multi-tenant

- Chaque table de la Data Foundation a une colonne `organization_id`
- FastAPI applique un filtre systematique sur chaque query
- Un client ne peut JAMAIS voir les donnees d'un autre client
- Tests automatises d'isolation a implementer

---

## 5. Navigation & ecrans

### Sidebar (fixe)

```
SIDEBAR CLIENT                    SIDEBAR ADMIN
-----                             -----
Dashboard                         Dashboard
Donnees (lecture seule)           Donnees (upload + validation)
Previsions                        Previsions
  Capacite humaine                  Capacite humaine
  Volume marchandise                Volume marchandise
Arbitrage                         Arbitrage
Decisions                         Decisions
Rapports                          Rapports
-----                             -----
Parametres                        Parametres
                                  Gestion clients (admin only)
```

### Ecran : Dashboard

**Zone 1 -- Banniere d'impact Praedixa** (haut de page)

- Score de sante global : X/100 (tendance sur 30j)
- 3 cards KPI :
  - Economies realisees ce mois (EUR)
  - Alertes evitees grace aux predictions
  - Decisions documentees pour le CODIR

**Zone 2 -- Capacite par dimension**

- Barre de progression par dimension (humain, marchandise)
- Score de couverture (% capacite vs demande)
- Indicateur de risque (vert/orange/rouge) avec horizon temporel

**Zone 3 -- Alertes actives**

- Liste des gaps detectes, tries par severite
- Chaque alerte cliquable -> arbitrage
- Lien direct "Voir options d'arbitrage"

**Zone 4 -- Graphiques tendanciels**

- Forecast vs Reel (30 derniers jours) par dimension
- Impact Praedixa : cout sans vs avec Praedixa (bar chart)

### Ecran : Donnees (client = lecture seule)

- Date du dernier import, prochain refresh prevu
- Bouton "Demander une mise a jour" (notification equipe Praedixa)
- Stats : nombre de sites, equipes, agents (agrege)
- Score de qualite des donnees (completude, historique, charge)
- Tableau du perimetre couvert (site, equipes, periode)

### Ecran : Previsions

- Filtres : horizon (J+3, J+7, J+14), site, dimension
- Carte de risque hierarchique : site > equipe > score
- Barres de risque visuelles (% de probabilite)
- Graphique timeline : evolution du risque predit sur 14 jours
- Niveau de confiance du modele
- Chaque ligne cliquable -> detail + bouton "Arbitrer"

### Ecran : Arbitrage

- Contexte : site, equipe, horizon, deficit prevu
- Options comparees (tableau) :
  - Heures supplementaires : cout, delai, impact couverture, risque
  - Interim : cout, delai, impact couverture, risque
  - Reallocation inter-sites : cout, delai, impact couverture, risque
  - Degradation acceptee : cout 0 EUR + cout indirect, impact, risque SLA
- Recommandation Praedixa (mise en avant)
- Bouton "Valider cette option" -> enregistre dans le journal de decisions

### Ecran : Decisions

- Journal chronologique des decisions prises
- Colonnes : date, site, alerte, option choisie, cout, decideur
- Suivi d'impact : avant/apres (quand disponible)
- Export PDF pour le CODIR

### Ecran : Rapports

- Generation de rapports PDF structures
- Types : diagnostic mensuel, rapport d'impact, export DAF
- Historique des rapports generes
- Telechargement direct

### Ecran : Parametres

- Organisation (nom, secteur, logo)
- Sites et equipes (lecture pour client, edition pour admin)
- Seuils d'alerte personnalisables
- Preferences de notification

---

## 6. Design system

### Philosophie

Style **Stripe Dashboard** : light mode, epure, premium mais accessible.
Cible : directeurs d'exploitation (45-55 ans), pas des developpeurs.

### Palette de couleurs

| Role              | Couleur                | Usage                                 |
| ----------------- | ---------------------- | ------------------------------------- |
| Background page   | `#f6f8fa`              | Fond global de l'app                  |
| Background cartes | `#ffffff`              | Cards, modals, panels                 |
| Sidebar           | `#ffffff` / `#fafafa`  | Navigation, bordure droite fine       |
| Texte principal   | `#0f0f0f` (charcoal)   | Titres, chiffres importants           |
| Texte secondaire  | `#6b7280` (gray-500)   | Labels, descriptions                  |
| Bordures          | `#e5e7eb` (gray-200)   | Separations fines, contours cards     |
| Accent Praedixa   | `#f59e0b` (amber-500)  | CTA, elements de marque, liens actifs |
| Succes            | `#22c55e` (green-500)  | Statut OK, tendance positive          |
| Alerte            | `#f97316` (orange-500) | Risque moyen                          |
| Danger            | `#ef4444` (red-500)    | Risque critique                       |

### Typographie

| Role                    | Font                        | Taille               |
| ----------------------- | --------------------------- | -------------------- |
| Gros chiffres KPI       | Plus Jakarta Sans, Bold     | 32-40px              |
| Titres de section       | Plus Jakarta Sans, Semibold | 18-20px              |
| Corps de texte          | Plus Jakarta Sans, Regular  | 14-15px              |
| Labels / metadata       | Plus Jakarta Sans, Medium   | 12-13px, gray-500    |
| Titres de page (accent) | DM Serif Display            | 24-28px (parcimonie) |

### Composants UI

- **Cards** : fond blanc, border 1px solid gray-200, radius 8px, pas d'ombre
  (shadow subtile au hover)
- **Sidebar** : items avec border-left amber au hover/actif
- **Tableaux** : lignes alternees subtiles, header gray-100, pas de bordures verticales
- **Graphiques** : lignes fines, couleurs sobres (gray + amber accent), whitespace genereux
- **Boutons** : primaire = amber-500 fond + blanc texte ; secondaire = outline gris

### Librairie de graphiques

**Tremor** (composants React pour dashboards, style Stripe, base Tailwind)

### Composants partages avec la landing

- Button (packages/ui) -- adapter les variants pour le dashboard
- Card, Badge, Input, Label, Spinner (packages/ui)
- Etendre packages/ui avec les composants dashboard specifiques

---

## 7. Decisions architecturales cles

| Decision            | Choix                                    | Raison                                              |
| ------------------- | ---------------------------------------- | --------------------------------------------------- |
| Frontend framework  | Next.js 15 (App Router)                  | Coherence avec la landing, SSR, partage packages    |
| Backend framework   | FastAPI                                  | Ecosysteme Python (ML), performance async, Pydantic |
| Base de donnees     | PostgreSQL (Scaleway)                    | Robuste, relationnel, souverainete France           |
| Auth                | Supabase Auth                            | Gratuit, securise, MFA, JWT, EU                     |
| Graphiques          | Tremor                                   | Style Stripe, composants React, base Tailwind       |
| Hebergement donnees | Scaleway (Paris)                         | Souverainete France, argument commercial B2B        |
| Inference ML        | En dehors de la web app                  | Performance API, separation des concerns            |
| Upload donnees      | Controle interne (equipe Praedixa)       | Qualite des donnees, fiabilite des modeles          |
| Multi-tenant        | Isolation par organization_id            | Securite, pas de fuite inter-clients                |
| Monorepo            | apps/webapp + apps/api dans le meme repo | Un seul repo, PR transversales, types partages      |

---

## 8. Sequencement du developpement

### Phase 1 : Fondations

- Setup apps/webapp (Next.js 15 + Tailwind + Tremor)
- Setup apps/api (FastAPI + SQLAlchemy + Pydantic)
- Auth Supabase (login/logout, verification JWT)
- Schema PostgreSQL (Data Foundation)
- Sidebar + layout de base
- Deploiement Scaleway (API + DB)

### Phase 2 : Diagnostic (premier ecran fonctionnel)

- Dashboard avec KPIs pre-calcules
- Ecran Donnees (lecture seule)
- Ecran Previsions (capacite humaine + marchandise)
- Donnees de demonstration realistes

### Phase 3 : Arbitrage & decisions

- Ecran Arbitrage (options chiffrees)
- Ecran Decisions (journal + validation)
- Logique de recommandation

### Phase 4 : Rapports & polish

- Generation PDF
- Ecran Rapports
- Parametres
- Vue admin (gestion clients, upload)
- Tests E2E
- Optimisation performance

---

## 9. Contraintes & risques

| Risque                                | Mitigation                             |
| ------------------------------------- | -------------------------------------- |
| Cloudflare Workers size limit (3 MiB) | Monitoring taille bundle, tree-shaking |
| Qualite des donnees client            | Ingestion manuelle par equipe Praedixa |
| Performance DB sur Scaleway free tier | Monitoring, upgrade si necessaire      |
| Complexite multi-tenant               | Tests automatises d'isolation          |
| Supabase Auth downtime                | Fallback / cache JWT cote API          |

---

## 10. Cout mensuel estime (POC)

| Service                      | Cout                |
| ---------------------------- | ------------------- |
| Cloudflare Workers (webapp)  | Gratuit             |
| Scaleway Container (FastAPI) | ~7-15 EUR           |
| Scaleway Managed PostgreSQL  | ~7-15 EUR           |
| Scaleway Object Storage      | ~1 EUR              |
| Supabase Auth                | Gratuit             |
| **Total**                    | **~15-31 EUR/mois** |
