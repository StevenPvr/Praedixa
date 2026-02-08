# Redesign UX Webapp Praedixa — Specification Complete

**Statut** : Pret pour implementation
**Public cible** : Directeurs d'exploitation, responsables logistique, responsables RH — PME/ETI avec 100+ collaborateurs terrain
**Ton de voix** : Professionnel, direct, ancre dans le metier. Pas de jargon data/tech. Parler en termes de "sites", "equipes", "heures", "couts".

---

## Table des matieres

1. [Diagnostic UX global](#1-diagnostic-ux-global)
2. [Strategie globale](#2-strategie-globale)
3. [Sidebar — nouvelle structure](#3-sidebar--nouvelle-structure)
4. [Dashboard](#4-dashboard)
5. [Donnees > Sites & Departements](#5-donnees--sites--departements)
6. [Donnees > Datasets](#6-donnees--fichiers-importes)
7. [Donnees > Canonique](#7-donnees--donnees-consolidees)
8. [Donnees > Dataset detail](#8-donnees--detail-dun-fichier)
9. [Previsions > Heatmap](#9-previsions--vue-par-site)
10. [Previsions > Alertes liste](#10-previsions--toutes-les-alertes)
11. [Previsions > Alerte detail](#11-previsions--detail-dune-alerte)
12. [Previsions > Dimension detail](#12-previsions--detail-par-dimension)
13. [Arbitrage > Liste](#13-arbitrage--alertes-a-traiter)
14. [Arbitrage > Detail](#14-arbitrage--choix-de-solution)
15. [Arbitrage > Historique](#15-arbitrage--decisions-passees)
16. [Decisions > Journal](#16-suivi--journal-des-actions)
17. [Decisions > Detail](#17-suivi--detail-dune-action)
18. [Decisions > Statistiques](#18-suivi--tableau-de-bord-qualite)
19. [Rapports](#19-rapports)
20. [Parametres](#20-parametres)
21. [Glossaire metier](#21-glossaire-metier)

---

## 1. Diagnostic UX global

### Problemes identifies

| Symptome client                          | Cause racine                                                                                                                               | Impact                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| "On ne comprend pas les fonctionnalites" | Titres generiques ("Dashboard", "Donnees", "Previsions"), pas de phrase d'accroche explicative                                             | L'utilisateur ne sait pas POURQUOI il est sur cette page |
| "On ne comprend pas les mots"            | Jargon technique partout : "canonique", "heatmap", "P(rupture)", "Pareto", "override", "shift", "horizon J+7", "proof pack"                | Utilisateurs non-tech perdus                             |
| "Tout se ressemble"                      | Toutes les pages = meme layout (titre + sous-titre + tableau). Pas de differenciation visuelle entre sections                              | Impossible de se reperer visuellement                    |
| "Informations gadget"                    | KPIs sans contexte ("Taux couverture 87.3%"). Pas de comparaison temporelle, pas de "par rapport a quoi ?", pas de recommandation d'action | Aucun levier d'action                                    |
| "C'est catastrophique"                   | Accumulation de tous les problemes ci-dessus                                                                                               | Abandon apres 2-3 visites                                |

### Anti-patterns recurrents

1. **Titres-etiquettes** : "Dashboard", "Donnees", "Decisions" — ne communiquent AUCUNE valeur
2. **Sous-titres creux** : "Vue d'ensemble de la couverture operationnelle" — reformule le titre sans rien ajouter
3. **Tableaux bruts** : 80% des pages sont un tableau avec des colonnes techniques. Pas de mise en contexte.
4. **Severite en anglais** : "critical", "high", "medium", "low" affiches tels quels dans les Badge
5. **IDs tronques** : `chosenOptionId.slice(0, 8) + "..."` affiches a l'utilisateur
6. **Unites cryptiques** : "Gap (h)", "Abs", "HS", "P(rupture)", "Cap HS/shift"
7. **Etats vides deprimants** : "Aucune donnee de couverture disponible" — aucune action proposee
8. **Repetition Dashboard/Previsions** : Memes alertes, meme heatmap, memes colonnes dans 3 pages differentes

---

## 2. Strategie globale

### 2.1 Nouveau ton de voix

**Avant** : Technique, passif, sec

> "Vue d'ensemble de la couverture operationnelle"
> "Donnees operationnelles normalisees par site, date et shift"

**Apres** : Direct, oriente action, ancre dans le quotidien

> "Vos sites sont-ils prets pour les 7 prochains jours ?"
> "Toutes les donnees de vos equipes, consolidees et a jour"

**Regles** :

- Les titres de page repondent a la question "A quoi ca sert ?"
- Les sous-titres repondent a "Qu'est-ce que je vais trouver ici ?"
- Les labels de metriques repondent a "Qu'est-ce que ce chiffre signifie concretement ?"

### 2.2 Glossaire de renommage (termes interdits → remplacement)

| Terme interdit                    | Remplacement                         | Justification                                                |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| Heatmap                           | Carte de couverture / Vue par site   | Terme technique data viz                                     |
| Coverage alert                    | Alerte sous-effectif                 | Le metier, pas la technique                                  |
| P(rupture)                        | Risque de sous-effectif              | Probabilite n'est pas un concept metier                      |
| Override                          | Choix manuel (hors recommandation)   | Anglicisme technique                                         |
| Proof Pack                        | Bilan mensuel de performance         | Le livrable, pas le contenant                                |
| Shift                             | Poste (matin/apres-midi)             | Anglicisme courant en logistique mais "poste" est plus clair |
| Horizon J+3/J+7/J+14              | A 3 jours / A 7 jours / A 14 jours   | Plus explicite                                               |
| Canonique                         | Consolidees                          | Jargon data engineering                                      |
| Gap (h)                           | Heures manquantes                    | Le metier                                                    |
| Pareto                            | Meilleur compromis                   | Jargon optimisation                                          |
| Dataset                           | Fichier importe                      | Le geste utilisateur                                         |
| Severity critical/high/medium/low | Critique / Elevee / Moderee / Faible | Francais                                                     |
| BAU (Business As Usual)           | Sans intervention                    | Jargon consulting                                            |
| Delta cout                        | Ecart de cout                        | Francais courant                                             |
| Adoption                          | Taux de suivi des recommandations    | Plus explicite                                               |

### 2.3 Differenciation visuelle par section

Chaque section de la sidebar a un accent couleur qui apparait dans :

- L'icone active de la sidebar
- Les en-tetes de section sur la page
- Les badges specifiques a la section

| Section         | Couleur accent | Icone Lucide    | Emotion               |
| --------------- | -------------- | --------------- | --------------------- |
| Tableau de bord | `amber-500`    | LayoutDashboard | Vue globale, synthese |
| Donnees         | `blue-500`     | Database        | Reference, stabilite  |
| Anticipation    | `violet-500`   | TrendingUp      | Futur, prevoyance     |
| Traitement      | `amber-600`    | Zap             | Action, decision      |
| Suivi           | `emerald-500`  | ClipboardCheck  | Verification, boucle  |
| Rapports        | `slate-600`    | FileBarChart    | Bilan, formalisme     |
| Reglages        | `gray-500`     | Settings        | Configuration         |

### 2.4 Patron de page standard

Chaque page doit suivre ce patron :

```
┌──────────────────────────────────────────────────────────┐
│ [Icone section]  Titre de page (DM Serif, 2xl)           │
│ Sous-titre explicatif (gray-500, text-sm, max 1 ligne)   │
├──────────────────────────────────────────────────────────┤
│ [Bandeau contextuel — optionnel]                         │
│ Ex: "3 sites presentent un risque cette semaine"         │
├──────────────────────────────────────────────────────────┤
│ [KPIs / Metriques — si pertinent]                        │
├──────────────────────────────────────────────────────────┤
│ [Filtres — si pertinent]                                 │
├──────────────────────────────────────────────────────────┤
│ [Contenu principal]                                      │
├──────────────────────────────────────────────────────────┤
│ [CTA ou navigation]                                      │
└──────────────────────────────────────────────────────────┘
```

Le **bandeau contextuel** est NOUVEAU et crucial : il transforme une page passive en page active. Exemples :

- Vert : "Tous vos sites sont couverts pour les 7 prochains jours"
- Orange : "2 sites presentent un risque modere cette semaine"
- Rouge : "Attention : 3 alertes critiques necessitent votre action"

Implementation : un composant `StatusBanner` (wrapper autour de `div` avec `role="status"`) avec 3 variants : `success`, `warning`, `danger`.

---

## 3. Sidebar — nouvelle structure

### Structure actuelle (problematique)

```
Dashboard
Donnees
  Sites & Departements
  Datasets
  Donnees canoniques
Previsions
  Heatmap couverture
  Alertes couverture
Arbitrage
  Scenarios
  Historique
Decisions
  Journal
  Statistiques
Rapports
Parametres
```

**Problemes** :

- "Donnees" est un mot fourre-tout sans valeur
- La separation Previsions / Arbitrage / Decisions correspond au pipeline technique, pas au workflow utilisateur
- L'utilisateur pense en termes de : "Je vois un probleme → Je decide quoi faire → Je verifie que ca a marche"

### Nouvelle structure

```
Tableau de bord                      (icone: LayoutDashboard)
Donnees                              (icone: Database)
  Mes sites                          → /donnees
  Fichiers importes                  → /donnees/datasets
  Donnees consolidees                → /donnees/canonique
Anticipation                         (icone: TrendingUp)
  Vue par site                       → /previsions
  Toutes les alertes                 → /previsions/alertes
Traitement                           (icone: Zap)
  Alertes a traiter                  → /arbitrage
  Decisions passees                  → /arbitrage/historique
Suivi                                (icone: ClipboardCheck)
  Journal des actions                → /decisions
  Qualite des decisions              → /decisions/stats
Rapports                             (icone: FileBarChart)
Reglages                             (icone: Settings, admin only)
```

**Changements cles** :

1. "Dashboard" → "Tableau de bord" (francisation)
2. "Previsions" → "Anticipation" (le benefice, pas la technique)
3. "Arbitrage" → "Traitement" (l'action de traiter un probleme)
4. "Decisions" → "Suivi" (la boucle de retour)
5. Sous-items renommes en termes comprehensibles
6. "Parametres" → "Reglages" (plus courant)
7. "Rapports" reste (terme naturel en entreprise)

### Code concret pour `NAV_ITEMS`

```typescript
const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Donnees",
    href: "/donnees",
    icon: Database,
    children: [
      { label: "Mes sites", href: "/donnees" },
      { label: "Fichiers importes", href: "/donnees/datasets" },
      { label: "Donnees consolidees", href: "/donnees/canonique" },
    ],
  },
  {
    label: "Anticipation",
    href: "/previsions",
    icon: TrendingUp,
    children: [
      { label: "Vue par site", href: "/previsions" },
      { label: "Toutes les alertes", href: "/previsions/alertes" },
    ],
  },
  {
    label: "Traitement",
    href: "/arbitrage",
    icon: Zap,
    children: [
      { label: "Alertes a traiter", href: "/arbitrage" },
      { label: "Decisions passees", href: "/arbitrage/historique" },
    ],
  },
  {
    label: "Suivi",
    href: "/decisions",
    icon: ClipboardCheck,
    children: [
      { label: "Journal des actions", href: "/decisions" },
      { label: "Qualite des decisions", href: "/decisions/stats" },
    ],
  },
  { label: "Rapports", href: "/rapports", icon: FileBarChart },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Reglages", href: "/parametres", icon: Settings, adminOnly: true },
];
```

Imports a ajouter : `Zap`, `ClipboardCheck`, `FileBarChart` depuis `lucide-react`.

---

## 4. Dashboard

**URL** : `/dashboard`
**Objectif conversion** : L'utilisateur comprend en 5 secondes si tout va bien ou s'il doit agir.

### En-tete

| Champ      | Avant                                            | Apres                                                 |
| ---------- | ------------------------------------------------ | ----------------------------------------------------- |
| Titre h1   | "Dashboard"                                      | "Tableau de bord"                                     |
| Sous-titre | "Vue d'ensemble de la couverture operationnelle" | "Vos sites sont-ils prets pour les prochains jours ?" |

### Bandeau contextuel (NOUVEAU)

Ajouter un bandeau colore AVANT les KPIs, base sur les donnees chargees :

```
SI alertes critiques > 0 :
  Rouge — "⚠ {n} alerte(s) critique(s) necessitent votre attention immediate"
  CTA : "Voir les alertes" → /previsions/alertes

SI alertes > 0 mais aucune critique :
  Orange — "{n} site(s) presentent un risque cette semaine"
  CTA : "Voir le detail" → /previsions

SI aucune alerte :
  Vert — "Tous vos sites sont couverts pour les 7 prochains jours"
```

**Note** : Ne pas utiliser d'emoji dans l'implementation. Utiliser une icone Lucide (AlertTriangle pour danger/warning, CheckCircle2 pour success).

### KPIs — nouveau wording

| Avant                   | Apres                       | Explication du changement                                        |
| ----------------------- | --------------------------- | ---------------------------------------------------------------- |
| "Taux couverture moyen" | "Couverture equipes"        | Plus court, plus humain                                          |
| "Alertes actives"       | "Sites en alerte"           | Ce qui compte c'est le nombre de SITES, pas d'alertes abstraites |
| "Cout estime J+7"       | "Cout prevu a 7 jours"      | Pas de "J+7"                                                     |
| "Taux adoption"         | "Suivi des recommandations" | "Adoption" est du jargon produit                                 |

Sous chaque StatCard, ajouter un `trend` quand les donnees le permettent :

- Comparer a la semaine precedente
- Afficher "+2.3%" ou "-1.5%" avec fleche

### Section "Heatmap de couverture"

| Champ     | Avant                                    | Apres                                                                                                                                |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Titre h2  | "Heatmap de couverture"                  | "Couverture par site et par jour"                                                                                                    |
| Etat vide | "Aucune donnee de couverture disponible" | "Les donnees de couverture apparaitront ici des que vos fichiers seront importes." + Lien "Importer des donnees" → /donnees/datasets |

### Section "Alertes actives"

| Champ              | Avant                                 | Apres                                                     |
| ------------------ | ------------------------------------- | --------------------------------------------------------- |
| Titre h2           | "Alertes actives"                     | "Alertes en cours"                                        |
| Colonne "Site"     | "Site" (affiche siteId UUID)          | "Site" (afficher le NOM du site, pas l'ID)                |
| Colonne "Shift"    | "Shift"                               | "Poste"                                                   |
| Colonne "Severite" | "Severite" (valeur "critical"/"high") | "Urgence" (valeur "Critique"/"Elevee"/"Moderee"/"Faible") |
| Colonne "Gap (h)"  | "Gap (h)"                             | "Heures manquantes"                                       |
| Etat vide          | "Aucune alerte active"                | "Aucune alerte en cours — tous vos sites sont couverts."  |

### Section "Tendance des couts"

| Champ              | Avant                                | Apres                                                                             |
| ------------------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| Titre h2           | "Tendance des couts"                 | "Performance globale"                                                             |
| "Gain net total"   | "Gain net total"                     | "Economies realisees"                                                             |
| "Adoption moyenne" | "Adoption moyenne"                   | "Recommandations suivies"                                                         |
| "Alertes emises"   | "Alertes emises"                     | "Alertes detectees"                                                               |
| "Alertes traitees" | "Alertes traitees"                   | "Alertes resolues"                                                                |
| Etat vide          | "Aucune donnee de preuve disponible" | "Vos bilans de performance apparaitront ici apres le premier mois d'utilisation." |

### Differenciation visuelle Dashboard

- Le bandeau contextuel est LA nouveaute visuelle du Dashboard — il doit etre le premier element visible.
- Les StatCards doivent avoir un accent de couleur different selon la valeur (deja le cas via `variant`).
- La section "Performance globale" utilise `font-serif` pour les gros chiffres (deja le cas).

---

## 5. Donnees — Sites & Departements

**URL** : `/donnees`
**Objectif** : L'utilisateur verifie que ses sites et departements sont bien configures.

### En-tete

| Champ      | Avant                                                | Apres                                                          |
| ---------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| Titre h1   | "Donnees"                                            | "Mes sites et equipes"                                         |
| Sous-titre | "Consultation des donnees importees (lecture seule)" | "Retrouvez tous vos sites, departements et leur configuration" |

### Lien vers Datasets

| Champ         | Avant                                           | Apres                                                 |
| ------------- | ----------------------------------------------- | ----------------------------------------------------- |
| Titre du lien | "Datasets"                                      | "Fichiers importes"                                   |
| Description   | "Voir les datasets configures et leurs donnees" | "Consultez et gerez vos fichiers de donnees importes" |

### Section Sites

| Champ    | Avant   | Apres       |
| -------- | ------- | ----------- |
| Titre h2 | "Sites" | "Vos sites" |

### Section Departements

| Champ    | Avant          | Apres                        |
| -------- | -------------- | ---------------------------- |
| Titre h2 | "Departements" | "Vos equipes / departements" |

---

## 6. Donnees — Fichiers importes

**URL** : `/donnees/datasets`
**Objectif** : L'utilisateur voit ses fichiers importes et leur etat.

### En-tete

| Champ            | Avant                | Apres                         |
| ---------------- | -------------------- | ----------------------------- |
| PageHeader title | "Datasets"           | "Fichiers importes"           |
| Breadcrumbs      | "Donnees > Datasets" | "Donnees > Fichiers importes" |

### Etat vide

| Avant                                              | Apres                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| "Aucun dataset configure pour cette organisation." | "Aucun fichier importe pour le moment. Importez vos premieres donnees pour demarrer l'analyse." + Bouton "Importer un fichier" |

### Pagination

| Avant                        | Apres                               |
| ---------------------------- | ----------------------------------- |
| "Page 1 sur 3 (36 datasets)" | "Page 1 sur 3 (36 fichiers)"        |
| "Precedent" / "Suivant"      | "Page precedente" / "Page suivante" |

---

## 7. Donnees — Donnees consolidees

**URL** : `/donnees/canonique`
**Objectif** : L'utilisateur explore les donnees fusionnees et verifie la qualite.

### En-tete

| Champ      | Avant                                                         | Apres                                                     |
| ---------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| Titre h1   | "Donnees canoniques"                                          | "Donnees consolidees"                                     |
| Sous-titre | "Donnees operationnelles normalisees par site, date et shift" | "Toutes les donnees de vos equipes, fusionnees et a jour" |

### Bouton import

| Avant          | Apres                 |
| -------------- | --------------------- |
| "Importer CSV" | "Importer un fichier" |

### MetricCards

| Avant                   | Apres                   |
| ----------------------- | ----------------------- |
| "Total enregistrements" | "Lignes de donnees"     |
| "Couverture"            | "Taux de remplissage"   |
| "Taux absence moyen"    | "Absence moyenne"       |
| "Shifts manquants"      | "Postes non renseignes" |

### Filtres

| Avant                | Apres             |
| -------------------- | ----------------- |
| "Tous les shifts"    | "Tous les postes" |
| "Matin (AM)"         | "Matin"           |
| "Apres-midi (PM)"    | "Apres-midi"      |
| Label filtre "Shift" | "Poste"           |

### Colonnes du tableau

| Avant      | Apres              |
| ---------- | ------------------ |
| "Shift"    | "Poste"            |
| "Capacite" | "Heures prevues"   |
| "Realise"  | "Heures realisees" |
| "Abs"      | "Absences (h)"     |
| "HS"       | "Heures sup."      |
| "Interim"  | "Interim (h)"      |

### Etat vide

| Avant                             | Apres                                                               |
| --------------------------------- | ------------------------------------------------------------------- |
| "Aucune donnee canonique trouvee" | "Aucune donnee pour ces criteres. Essayez de modifier les filtres." |

---

## 8. Donnees — Detail d'un fichier

**URL** : `/donnees/datasets/[datasetId]`
**Objectif** : L'utilisateur inspecte le contenu et la qualite d'un fichier importe.

### Breadcrumbs

| Avant                        | Apres                                 |
| ---------------------------- | ------------------------------------- |
| "Donnees > Datasets > [nom]" | "Donnees > Fichiers importes > [nom]" |

### Sections

| Avant                          | Apres                    |
| ------------------------------ | ------------------------ |
| Titre "Schema des colonnes"    | "Structure du fichier"   |
| Titre "Apercu des donnees"     | "Extrait des donnees"    |
| Titre "Historique d'ingestion" | "Historique des imports" |

### Metadata items

| Avant            | Apres              |
| ---------------- | ------------------ |
| "Table"          | "Table source"     |
| "Index temporel" | "Colonne de date"  |
| "Regroupements"  | "Regroupement par" |
| "Lignes"         | "Nombre de lignes" |

---

## 9. Previsions — Vue par site

**URL** : `/previsions`
**Objectif** : L'utilisateur identifie visuellement quels sites sont en tension pour les prochains jours.

### En-tete

| Champ      | Avant                                          | Apres                                                      |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------- |
| Titre h1   | "Previsions"                                   | "Anticipation"                                             |
| Sous-titre | "Heatmap de couverture et alertes par horizon" | "Identifiez les sites en tension pour les prochains jours" |

### Onglets horizon

| Avant  | Apres        |
| ------ | ------------ |
| "J+3"  | "A 3 jours"  |
| "J+7"  | "A 7 jours"  |
| "J+14" | "A 14 jours" |

### Filtre site

| Avant              | Apres                                            |
| ------------------ | ------------------------------------------------ |
| "Filtrer par site" | "Tous les sites" (placeholder du SelectDropdown) |

### Section Heatmap

| Champ     | Avant                         | Apres                                                                                                |
| --------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Titre h2  | "Couverture par site"         | "Couverture par site et par jour"                                                                    |
| Etat vide | "Aucune donnee de couverture" | "Aucune donnee de couverture pour cet horizon. Changez la periode ou importez de nouvelles donnees." |

### Section Alertes

| Champ    | Avant             | Apres                      |
| -------- | ----------------- | -------------------------- |
| Titre h2 | "Alertes actives" | "Alertes de sous-effectif" |

### Colonnes du tableau alertes

| Avant                        | Apres                        |
| ---------------------------- | ---------------------------- |
| "Shift"                      | "Poste"                      |
| "Severite" (valeur anglaise) | "Urgence" (valeur francaise) |
| "P(rupture)"                 | "Risque"                     |
| "Gap (h)"                    | "Heures manquantes"          |
| Lien "Detail"                | "Voir le detail"             |

### Etat vide

| Avant                            | Apres                                                         |
| -------------------------------- | ------------------------------------------------------------- |
| "Aucune alerte pour cet horizon" | "Aucune alerte pour cette periode — vos sites sont couverts." |

---

## 10. Previsions — Toutes les alertes

**URL** : `/previsions/alertes`
**Objectif** : L'utilisateur consulte et filtre l'ensemble des alertes.

### En-tete

| Champ      | Avant                              | Apres                                                                  |
| ---------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Titre h1   | "Alertes de couverture"            | "Toutes les alertes"                                                   |
| Sous-titre | "Toutes les alertes de couverture" | "Historique et suivi de toutes les alertes de sous-effectif detectees" |

### Filtre statut

| Avant              | Apres              |
| ------------------ | ------------------ |
| "Tous les statuts" | "Tous les statuts" |
| "Ouvertes"         | "En cours"         |
| "Acquittees"       | "Prises en compte" |
| "Resolues"         | "Resolues"         |

### Colonnes

| Avant         | Apres               |
| ------------- | ------------------- |
| "Shift"       | "Poste"             |
| "Horizon"     | "Echeance"          |
| "Severite"    | "Urgence"           |
| "Statut"      | "Etat"              |
| "P(rupture)"  | "Risque"            |
| "Gap (h)"     | "Heures manquantes" |
| Lien "Detail" | "Voir"              |

### Etat vide

| Avant                   | Apres                                         |
| ----------------------- | --------------------------------------------- |
| "Aucune alerte trouvee" | "Aucune alerte ne correspond a ces criteres." |

---

## 11. Previsions — Detail d'une alerte

**URL** : `/previsions/alertes/[alertId]`
**Objectif** : L'utilisateur comprend l'alerte et decide d'agir.

### En-tete

| Champ      | Avant                                           | Apres                                         |
| ---------- | ----------------------------------------------- | --------------------------------------------- |
| Titre h1   | "Detail de l'alerte"                            | "Detail de l'alerte" (ok)                     |
| Sous-titre | "Informations detaillees et facteurs de risque" | "Comprenez les causes et decidez de la suite" |

### Labels des champs

| Avant           | Apres                     |
| --------------- | ------------------------- |
| "Shift"         | "Poste"                   |
| "Horizon"       | "Echeance"                |
| "Severite"      | "Urgence"                 |
| "Statut"        | "Etat"                    |
| "P(rupture)"    | "Risque de sous-effectif" |
| "Gap (heures)"  | "Heures manquantes"       |
| "Impact estime" | "Cout estime"             |

### Section facteurs

| Avant                     | Apres                                                   |
| ------------------------- | ------------------------------------------------------- |
| "Facteurs de risque"      | "Causes identifiees"                                    |
| "Aucun facteur identifie" | "Aucune cause specifique identifiee pour cette alerte." |

### Boutons d'action

| Avant                   | Apres                  |
| ----------------------- | ---------------------- |
| "Arbitrer cette alerte" | "Trouver une solution" |
| "Retour aux alertes"    | "Retour a la liste"    |

---

## 12. Previsions — Detail par dimension

**URL** : `/previsions/[dimension]`

### Titres dimensions

| Avant                  | Apres                       |
| ---------------------- | --------------------------- |
| "Capacite humaine"     | "Disponibilite des equipes" |
| "Capacite marchandise" | "Capacite de traitement"    |
| "Vue globale"          | "Vue d'ensemble"            |

### Sous-titre

| Avant                                      | Apres                                                       |
| ------------------------------------------ | ----------------------------------------------------------- |
| "Previsions detaillees — capacite humaine" | "Previsions detaillees sur la disponibilite de vos equipes" |

---

## 13. Arbitrage — Alertes a traiter

**URL** : `/arbitrage`
**Objectif** : L'utilisateur voit les alertes qui necessitent une decision et choisit laquelle traiter.

### En-tete

| Champ      | Avant                                                           | Apres                                                         |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| Titre h1   | "Arbitrage"                                                     | "Alertes a traiter"                                           |
| Sous-titre | "Scenarios d'arbitrage pour les alertes de couverture ouvertes" | "Choisissez une alerte et comparez les solutions disponibles" |

### Bandeau contextuel (NOUVEAU)

```
SI alertes > 0 :
  Orange — "{n} alerte(s) en attente de votre decision"

SI alertes == 0 :
  Vert — "Toutes les alertes ont ete traitees"
```

### Colonnes

| Avant           | Apres                  |
| --------------- | ---------------------- |
| "Shift"         | "Poste"                |
| "Horizon"       | "Echeance"             |
| "Severite"      | "Urgence"              |
| "Gap (h)"       | "Heures manquantes"    |
| Lien "Arbitrer" | "Trouver une solution" |

### Etat vide

| Avant                              | Apres                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| "Aucune alerte ouverte a arbitrer" | "Toutes les alertes ont ete traitees. Revenez quand de nouvelles alertes apparaitront." |

---

## 14. Arbitrage — Choix de solution

**URL** : `/arbitrage/[alertId]`
**Objectif** : L'utilisateur compare les options et valide son choix. PAGE CRITIQUE — c'est ici que la valeur se materialise.

### En-tete

| Champ      | Avant                                           | Apres                                                              |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Titre h1   | "Arbitrage"                                     | "Choisir une solution"                                             |
| Sous-titre | "Comparez les scenarios et validez votre choix" | "Comparez les options et validez votre decision pour cette alerte" |

### Bandeau succes

| Avant                                                       | Apres                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| "Decision enregistree avec succes. Redirection en cours..." | "Votre decision a ete enregistree. Vous allez etre redirige..." |

### Section resume alerte

Le resume actuel est trop pauvre (juste l'ID). Il doit afficher :

- Nom du site (pas ID)
- Date concernee
- Poste
- Heures manquantes
- Urgence

### Cards d'options

| Avant              | Apres                   |
| ------------------ | ----------------------- |
| Badge "Pareto"     | Badge "Optimal"         |
| Badge "Recommande" | Badge "Recommande" (ok) |
| Label "Type"       | "Type de solution"      |
| Label "Cout"       | "Cout total"            |
| Label "Service"    | "Couverture attendue"   |
| Label "Heures"     | "Heures couvertes"      |

### Section graphique

| Avant                 | Apres                         |
| --------------------- | ----------------------------- |
| "Frontiere de Pareto" | "Compromis cout / couverture" |

### Bouton validation

| Avant                 | Apres                        |
| --------------------- | ---------------------------- |
| "Valider la decision" | "Confirmer mon choix"        |
| "Enregistrement..."   | "Enregistrement en cours..." |

---

## 15. Arbitrage — Decisions passees

**URL** : `/arbitrage/historique`
**Objectif** : L'utilisateur consulte ses decisions precedentes.

### En-tete

| Champ      | Avant                                          | Apres                                                                  |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| Titre h1   | "Historique d'arbitrage"                       | "Decisions passees"                                                    |
| Sous-titre | "Historique des decisions d'arbitrage passees" | "Retrouvez toutes les solutions choisies pour vos alertes precedentes" |

### Colonnes

| Avant                           | Apres                                      |
| ------------------------------- | ------------------------------------------ |
| "Shift"                         | "Poste"                                    |
| "Horizon"                       | "Echeance"                                 |
| "Override" (valeur "Oui"/"Non") | "Hors recommandation" (valeur "Oui"/"Non") |
| "Cout attendu"                  | "Cout prevu"                               |

### Etat vide

| Avant                         | Apres                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| "Aucune decision d'arbitrage" | "Aucune decision passee. Vos choix apparaitront ici apres le traitement de votre premiere alerte." |

---

## 16. Suivi — Journal des actions

**URL** : `/decisions`
**Objectif** : L'utilisateur suit l'execution de ses decisions et saisit les resultats observes.

### En-tete

| Champ      | Avant                                   | Apres                                                                   |
| ---------- | --------------------------------------- | ----------------------------------------------------------------------- |
| Titre h1   | "Decisions"                             | "Journal des actions"                                                   |
| Sous-titre | "Journal des decisions operationnelles" | "Suivez l'execution de vos decisions et comparez previsions vs realite" |

### Filtres

| Avant                             | Apres                                    |
| --------------------------------- | ---------------------------------------- |
| "Tous les horizons"               | "Toutes les echeances"                   |
| "J+3" / "J+7" / "J+14"            | "A 3 jours" / "A 7 jours" / "A 14 jours" |
| "Overrides uniquement" (checkbox) | "Choix hors recommandation uniquement"   |

### Colonnes

| Avant                           | Apres                                                       |
| ------------------------------- | ----------------------------------------------------------- |
| "Shift"                         | "Poste"                                                     |
| "Horizon"                       | "Echeance"                                                  |
| "Option choisie" (ID tronque !) | SUPPRIMER cette colonne — ne sert a rien pour l'utilisateur |
| "Override"                      | "Hors reco."                                                |
| "Cout attendu"                  | "Cout prevu"                                                |
| "Cout observe"                  | "Cout reel"                                                 |
| Lien "Detail"                   | "Voir"                                                      |

**Ajout** : nouvelle colonne "Ecart" qui affiche `cout reel - cout prevu` avec couleur :

- Vert si ecart <= 0 (on a fait mieux que prevu)
- Rouge si ecart > 0 (ca a coute plus que prevu)
- Gris si pas encore de cout reel

### Etat vide

| Avant                                            | Apres                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| "Aucune decision pour les filtres selectionnes." | "Aucune action pour ces criteres. Modifiez les filtres ou traitez de nouvelles alertes." |

---

## 17. Suivi — Detail d'une action

**URL** : `/decisions/[decisionId]`
**Objectif** : L'utilisateur saisit le resultat observe apres execution.

### En-tete

| Champ      | Avant                                        | Apres                                                            |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Titre h1   | "Detail de la decision"                      | "Detail de l'action"                                             |
| Sous-titre | "Informations et saisie du resultat observe" | "Comparez ce qui etait prevu avec ce qui s'est reellement passe" |

### Labels des champs

| Avant                         | Apres                                        |
| ----------------------------- | -------------------------------------------- |
| "Shift"                       | "Poste"                                      |
| "Horizon"                     | "Echeance"                                   |
| "Override" / Badge "Override" | "Hors recommandation" / Badge "Choix manuel" |
| "Raison override"             | "Raison du choix manuel"                     |

### Formulaire resultat

| Avant                             | Apres                                                |
| --------------------------------- | ---------------------------------------------------- |
| Titre "Resultat observe"          | "Retour terrain"                                     |
| "Cout observe (EUR)"              | "Cout reel constate (EUR)"                           |
| "Service observe (%)"             | "Couverture reelle (%)"                              |
| "Commentaire"                     | "Remarques (optionnel)"                              |
| Placeholder "Optionnel"           | "Ex: Interim arrive en retard, couverture partielle" |
| "Enregistrer le resultat"         | "Enregistrer le retour"                              |
| "Enregistrement..."               | "Enregistrement en cours..."                         |
| "Resultat enregistre avec succes" | "Retour enregistre avec succes"                      |

---

## 18. Suivi — Tableau de bord qualite

**URL** : `/decisions/stats`
**Objectif** : L'utilisateur mesure la qualite de ses decisions dans le temps.

### En-tete

| Champ      | Avant                                    | Apres                                                                     |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Titre h1   | "Statistiques des decisions"             | "Qualite des decisions"                                                   |
| Sous-titre | "Analyse des overrides et de l'adoption" | "Mesurez l'efficacite de vos choix et identifiez les axes d'amelioration" |

### MetricCards

| Avant              | Apres                   |
| ------------------ | ----------------------- |
| "Total decisions"  | "Actions enregistrees"  |
| "Overrides"        | "Choix manuels"         |
| "Taux override"    | "Taux de choix manuels" |
| "Delta cout moyen" | "Ecart de cout moyen"   |

### Section raisons

| Avant                                            | Apres                                       |
| ------------------------------------------------ | ------------------------------------------- |
| Titre "Top raisons d'override"                   | "Principales raisons des choix manuels"     |
| Colonne "Raison"                                 | "Raison invoquee"                           |
| Colonne "Occurrences"                            | "Nombre de fois"                            |
| Etat vide "Aucune raison d'override enregistree" | "Aucune raison enregistree pour le moment." |

---

## 19. Rapports

**URL** : `/rapports`
**Objectif** : L'utilisateur produit des bilans pour le CODIR ou les RH.

### En-tete

| Champ      | Avant                                        | Apres                                                              |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Titre h1   | "Rapports"                                   | "Rapports" (ok)                                                    |
| Sous-titre | "Syntheses, precision, couts et proof packs" | "Bilans hebdomadaires, analyse des couts et documents exportables" |

### Onglets

| Avant                   | Apres                      |
| ----------------------- | -------------------------- |
| "Synthese hebdomadaire" | "Bilan de la semaine"      |
| "Precision"             | "Fiabilite des previsions" |
| "Analyse couts"         | "Analyse des couts"        |
| "Proof Pack"            | "Bilans mensuels"          |

### Onglet Synthese — colonnes

| Avant           | Apres                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| "Debut semaine" | "Semaine du"                                                                                                      |
| "Fin semaine"   | "au"                                                                                                              |
| "Alertes"       | "Alertes detectees"                                                                                               |
| "Resolues"      | "Alertes resolues"                                                                                                |
| "En attente"    | "En attente" (ok)                                                                                                 |
| "Cout total"    | "Cout total" (ok)                                                                                                 |
| "Service moyen" | "Couverture moyenne"                                                                                              |
| Etat vide       | "Aucune donnee pour le moment. Les bilans hebdomadaires apparaitront apres votre premiere semaine d'utilisation." |

### Onglet Precision

| Avant                                             | Apres                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| "Graphique de precision des previsions (a venir)" | "Ce module est en cours de developpement. Il comparera bientot les previsions avec les observations reelles." |

### Onglet Couts

| Avant                               | Apres                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Titre "Waterfall des couts"         | "Decomposition des couts"                                                                      |
| Valeur "Cout BAU" dans le waterfall | "Sans intervention"                                                                            |
| Valeur "Optimisation mix"           | "Gain par reajustement"                                                                        |
| Valeur "Gains nets"                 | "Economies nettes"                                                                             |
| Valeur "Cout final"                 | "Cout final" (ok)                                                                              |
| Etat vide                           | "Pas encore de donnees de couts. L'analyse apparaitra apres la cloture de votre premier mois." |

### Onglet Bilans mensuels

| Avant                                   | Apres                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Titre "Proof Packs"                     | "Bilans mensuels"                                                                         |
| Bouton "Exporter PDF"                   | "Telecharger en PDF"                                                                      |
| Colonne "Gain net"                      | "Economies"                                                                               |
| Colonne "Adoption"                      | "Recommandations suivies"                                                                 |
| Colonne "Alertes emises"                | "Alertes detectees"                                                                       |
| Colonne "Alertes traitees"              | "Alertes resolues"                                                                        |
| Etat vide "Aucun proof pack disponible" | "Aucun bilan mensuel disponible. Le premier bilan sera genere a la fin du mois en cours." |

---

## 20. Parametres

**URL** : `/parametres`
**Objectif** : L'administrateur configure les couts, horaires et seuils.

### En-tete

| Champ      | Avant                                              | Apres                                                                            |
| ---------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Titre h1   | "Parametres"                                       | "Reglages"                                                                       |
| Sous-titre | "Configuration des couts, shifts, seuils et sites" | "Configurez les couts, horaires, seuils d'alerte et sites de votre organisation" |

### Onglets

| Avant             | Apres                  |
| ----------------- | ---------------------- |
| "Couts"           | "Baremes de couts"     |
| "Shifts"          | "Horaires des postes"  |
| "Seuils d'alerte" | "Seuils d'alerte" (ok) |
| "Sites"           | "Sites" (ok)           |
| "Export"          | "Exporter les donnees" |

### Onglet Baremes de couts

| Avant                      | Apres                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Titre "Parametres de cout" | "Baremes de couts par site"                                                               |
| Colonne "C. interne"       | "Cout horaire interne"                                                                    |
| Colonne "Maj HS"           | "Majoration heures sup."                                                                  |
| Colonne "C. interim"       | "Cout horaire interim"                                                                    |
| Colonne "Cap HS/shift"     | "Plafond heures sup./poste"                                                               |
| Colonne "Effectif depuis"  | "En vigueur depuis"                                                                       |
| Valeur "Defaut org"        | "Valeur par defaut"                                                                       |
| Etat vide                  | "Aucun bareme configure. Ajoutez vos premiers baremes de couts pour activer les calculs." |

### Onglet Horaires des postes

| Avant                             | Apres                           |
| --------------------------------- | ------------------------------- |
| Titre "Configuration des shifts"  | "Horaires des postes"           |
| En-tete "Shift"                   | "Poste"                         |
| En-tete "Debut"                   | "Debut" (ok)                    |
| En-tete "Fin"                     | "Fin" (ok)                      |
| En-tete "Label"                   | "Nom"                           |
| Valeur "AM"                       | "Matin"                         |
| Valeur "PM"                       | "Apres-midi"                    |
| Sous-titre "Capacites effectives" | "Limites operationnelles"       |
| "Cap HS/shift"                    | "Plafond heures sup. par poste" |
| "Cap interim/site"                | "Plafond interim par site"      |
| "Delai interim"                   | "Delai de mobilisation interim" |

### Onglet Seuils d'alerte

| Avant                  | Apres                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| "Risque sous-effectif" | "Seuil de risque sous-effectif"                                                 |
| "Taux absence"         | "Seuil d'alerte absence"                                                        |
| "Abs. consecutives"    | "Absences consecutives max."                                                    |
| "Precision prevision"  | "Fiabilite minimale des previsions"                                             |
| Etat vide              | "Parametres de l'organisation non disponibles. Contactez votre administrateur." |

### Onglet Export

| Avant                                       | Apres                                                               |
| ------------------------------------------- | ------------------------------------------------------------------- |
| "Exportez les donnees au format CSV ou PDF" | "Telechargez vos donnees au format tableur (CSV) ou document (PDF)" |
| "Exporter CSV"                              | "Telecharger CSV"                                                   |
| "Exporter PDF"                              | "Telecharger PDF"                                                   |

---

## 21. Glossaire metier

Ce glossaire doit etre DOCUMENTE quelque part dans l'application (page d'aide ou tooltip) pour aider les utilisateurs. Pour l'implementation, chaque terme ambigu dans un tableau devrait avoir un `title` tooltip HTML.

| Terme affiche           | Definition tooltip                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Couverture              | Pourcentage des heures de travail planifiees qui sont effectivement pourvues en personnel    |
| Risque de sous-effectif | Probabilite que les effectifs presents soient insuffisants pour assurer la charge de travail |
| Heures manquantes       | Nombre d'heures de travail non couvertes par les effectifs prevus                            |
| Poste                   | Tranche horaire de travail (ex : matin 6h-14h, apres-midi 14h-22h)                           |
| Echeance                | Delai avant la date concernee par l'alerte (3, 7 ou 14 jours)                                |
| Cout prevu              | Estimation du cout de la solution choisie avant sa mise en oeuvre                            |
| Cout reel               | Cout effectivement constate apres execution de la solution                                   |
| Recommandation          | Solution optimale calculee par le systeme, offrant le meilleur compromis cout/couverture     |
| Choix manuel            | Decision de l'utilisateur differente de la recommandation du systeme                         |
| Interim                 | Heures de travail assurees par du personnel temporaire externe                               |
| Heures supplementaires  | Heures de travail au-dela du poste normal, assurees par le personnel en place                |

---

## Notes d'implementation

### Priorite d'implementation

1. **P0 — Sidebar** : Le renommage de la sidebar est le changement le plus visible et le moins risque. A faire en premier.
2. **P0 — En-tetes de page** : Changer tous les h1/sous-titres — impact maximal pour effort minimal.
3. **P1 — Bandeau contextuel Dashboard** : Nouveau composant (simple wrapper `div` + `role="status"`), fort impact UX.
4. **P1 — Colonnes tableaux** : Renommer les labels de colonnes partout.
5. **P2 — Etats vides** : Nouveau wording + CTA dans les etats vides.
6. **P2 — Severite en francais** : Mapper les valeurs backend `critical/high/medium/low` → `Critique/Elevee/Moderee/Faible` dans les Badge renders.
7. **P3 — Tooltips glossaire** : Ajouter des `title` attributes sur les en-tetes de colonnes.
8. **P3 — Colonne ecart dans Journal** : Ajout d'une nouvelle colonne calculee.

### Regles pour les agents implementeurs

1. **NE PAS renommer les routes URL** — seul le wording visible change, pas les paths.
2. **NE PAS modifier les appels API** — le renommage est purement frontend.
3. **NE PAS creer de nouveaux composants** sauf le `StatusBanner` qui est un simple wrapper.
4. Les mappers de severite (`critical` → `Critique`) doivent etre dans un utilitaire partage, par ex. `lib/formatters.ts`.
5. Tester que les labels renommes n'ont pas casse les tests existants — mettre a jour les `getByText()` / `getByRole()`.

### Mappers a creer dans `lib/formatters.ts`

```typescript
export const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critique",
  high: "Elevee",
  medium: "Moderee",
  low: "Faible",
};

export const HORIZON_LABELS: Record<string, string> = {
  j3: "A 3 jours",
  j7: "A 7 jours",
  j14: "A 14 jours",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "En cours",
  acknowledged: "Prise en compte",
  resolved: "Resolue",
};

export function formatSeverity(severity: string): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

export function formatHorizon(horizon: string): string {
  return HORIZON_LABELS[horizon] ?? horizon;
}

export function formatAlertStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
```
