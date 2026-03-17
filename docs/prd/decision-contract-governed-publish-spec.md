# Decision Contract Governed Publish Spec

## Role de ce document

Ce document precise comment un `DecisionContract` devient l'objet gouverne central du produit.
Il complete:

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md` pour la cible produit;
- `docs/prd/coverage-v1-thin-slice-spec.md` pour la boucle Coverage V1;
- `docs/prd/decisionops-v1-execution-backbone.md` pour l'ordre d'execution;
- `docs/prd/matrice-verification-parcours-confiance.md` pour les preuves merge/release;
- `docs/prd/TODO.md` pour la fermeture structurelle.

Il ne decrit pas seulement le schema d'un contrat.
Il fixe:

- le lifecycle autorise;
- les transitions interdites;
- les gates de test, d'approbation et de publication;
- les invariants d'audit, rollback et separation des roles;
- le lien contract -> scenario -> approval -> action -> ledger.

## Pourquoi ce document existe

Le PRD dit que le `DecisionContract` est la brique la plus distinctive du produit.
Le repo a deja des fondations typees, des templates, un studio de lecture et des helpers.
Le gap restant n'est plus "definir le mot contrat".
Le gap est "rendre impossible qu'un contrat semi-defini, mal gouverne ou hors policy produise des decisions et des write-backs en production".

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/coverage-v1-thin-slice-spec.md`
- `docs/prd/decisionops-v1-execution-backbone.md`
- `docs/prd/matrice-verification-parcours-confiance.md`
- `docs/prd/TODO.md`

## Definition du DecisionContract dans ce spec

Un `DecisionContract` est l'objet logiciel versionne qui formalise:

- le perimetre de decision;
- les inputs et hypotheses minimum;
- l'objectif et les poids;
- les variables de decision autorisees;
- les contraintes dures et souples;
- la matrice d'approbation applicable;
- les permissions de write-back et templates d'action;
- la formule ROI et le template d'explication.

Un `DecisionContract` n'est pas:

- un simple `decision-config` technique;
- un ecran admin avec quelques champs;
- un prompt;
- une configuration locale non versionnee;
- une policy dupliquee dans plusieurs surfaces.

## Ce qu'un contrat gouverne doit garantir

Un contrat gouverne doit garantir simultanement:

1. qu'un designer peut le creer et le tester sans toucher la prod;
2. qu'un reviewer peut en comprendre l'impact avant publication;
3. qu'un approver ne valide pas un contrat qu'il a lui-meme modifie sans garde-fou;
4. qu'un runtime scenario ne peut lire qu'une version publiee et compatible;
5. qu'un dispatch ne peut partir qu'avec des permissions et destinations explicitement liees au contrat;
6. qu'un ledger peut reconstituer quelle version du contrat a conduit a quelle action et quel ROI.

## Structure canonique minimale

### Metadata obligatoires

- `contract_id`
- `version`
- `pack`
- `status`
- `owner`
- `created_by`
- `last_changed_by`
- `change_reason`
- `published_at`
- `archived_at`

### Blocs fonctionnels obligatoires

- `scope`
- `inputs`
- `objective`
- `decision_variables`
- `hard_constraints`
- `soft_constraints`
- `approvals`
- `actions`
- `roi_formula`
- `explanation_template`
- `policy_hooks`

### References obligatoires

- `template_id` si le contrat derive d'un template;
- `graph_version` ou reference de compatibilite equivalente;
- `event_schema_version` pour les emissions majeures liees au contrat;
- `model_policy_binding` pour la version minimale du couple modele/solver/policy.

## Lifecycle canonique

| Etat        | Ce qui est vrai                                            | Ce qui est interdit                           |
| ----------- | ---------------------------------------------------------- | --------------------------------------------- |
| `draft`     | edition libre sous permissions auteur/designer             | generation prod, dispatch prod, approval prod |
| `testing`   | simulation, backtest, shadow mode, checks de compatibilite | publication directe sans verdict              |
| `approved`  | revue terminee, contrat candidat a la publication          | mutation silencieuse des champs gouvernes     |
| `published` | seule version active pour un scope donne en production     | edition in-place, suppression silencieuse     |
| `archived`  | plus aucune nouvelle execution prod ne peut partir         | reactivation sans nouvelle version            |

## Transitions autorisees

| Transition              | Preconditions minimum                                              | Acteur minimum     |
| ----------------------- | ------------------------------------------------------------------ | ------------------ |
| `draft -> testing`      | schema valide, scope valide, references resolues                   | designer autorise  |
| `testing -> draft`      | retour correction documente                                        | designer autorise  |
| `testing -> approved`   | simulations passees, compatibilite validee, change reason complete | reviewer autorise  |
| `approved -> published` | SoD validee, gates vertes, conflit de scope resolu                 | publisher autorise |
| `published -> archived` | remplacement ou retrait motive, impact aval connu                  | publisher autorise |
| `published -> draft`    | interdit; utiliser fork/rollback                                   | n/a                |
| `archived -> published` | interdit; creer nouvelle version                                   | n/a                |

## Regles de transition critiques

- un contrat `draft` peut etre modifie;
- un contrat `testing` peut encore evoluer, mais toute mutation doit invalider le dernier verdict de test si elle touche `scope`, `objective`, `constraints`, `approvals`, `actions`, `roi_formula` ou `policy_hooks`;
- un contrat `approved` doit etre traite comme immuable;
- publier une correction ne modifie jamais la version publiee en place;
- toute correction post-approval passe par fork ou nouvelle version;
- toute mise hors service d'une version publiee doit laisser une trace d'archivage ou de rollback.

## Separation des roles

### Roles minimaux a distinguer

- `designer`: cree ou modifie le contrat;
- `reviewer`: verifie la stabilite fonctionnelle et la compatibilite;
- `publisher`: rend le contrat actif en production;
- `auditor`: lit l'historique, sans droit de mutation.

### Invariants SoD

- le meme acteur ne peut pas etre a la fois dernier editeur et unique publish approver d'un contrat critique;
- un contrat avec write-back sensible ou impact humain ne peut pas contourner la revue secondaire;
- si une exception SoD existe, elle doit etre explicite, policy-driven et auditee.

## Gates gouvernes

### Gate 1 - Contract validity

Le contrat ne quitte pas `draft` si:

- le schema minimal n'est pas complet;
- le scope est ambigu ou non resolu;
- une reference de template, policy ou graph est manquante;
- une permission de write-back cible un perimetre non autorise.

### Gate 2 - Testability

Le contrat ne quitte pas `testing` si:

- les simulations ou backtests obligatoires ne sont pas executes;
- la compatibilite contrat/runtime/graph/events n'est pas verte;
- les etats degrades attendus ne sont pas explicitement traites;
- le contrat ne sait pas expliquer baseline, alternatives et contraintes.

### Gate 3 - Governance

Le contrat ne quitte pas `approved` vers `published` si:

- la separation des roles n'est pas respectee;
- la matrice d'approbation n'est pas resolue;
- les templates d'action references ne sont pas versionnes;
- les permissions de destination ne sont pas fermees;
- la raison du changement ou le rollback plan est absent.

### Gate 4 - Runtime safety

Un runtime scenario ou un dispatch ne consomme pas le contrat si:

- le contrat n'est pas `published`;
- la version referencee n'est pas compatible avec le runtime ou le graph;
- le dataset trust ou la policy globale bloque la decision;
- le contrat a ete archive ou supplante pour ce scope.

## Contract readiness minimale avant publication

Un `DecisionContract` est publiable seulement si ces sections sont resolues:

| Section      | Minimum attendu                                          |
| ------------ | -------------------------------------------------------- |
| Scope        | entite, perimetre, horizon, exclusions, time zone        |
| Inputs       | sources et freshness minimales, fallback explicite       |
| Objective    | objectif principal et ponderations lisibles              |
| Constraints  | hard vs soft clairement separes                          |
| Approvals    | matrice par risque/cout/type d'action                    |
| Actions      | templates cibles, destinations, sandbox si necessaire    |
| ROI          | formule et methode contrefactuelle lisibles              |
| Explanation  | top drivers, contraintes liantes, baseline vs options    |
| Policy hooks | references vers policies globales, pas logique dupliquee |

## Lien contract -> scenario -> approval -> action -> ledger

### 1. Scenario

Le runtime scenario doit toujours enregistrer:

- `contract_id`
- `contract_version`
- `graph_version` ou equivalent
- `model_policy_binding`
- l'etat du dataset trust au moment du calcul

Une recommendation sans `contract_version` n'est pas une recommendation gouvernee.

### 2. Approval

L'inbox d'approbation doit deriver du contrat:

- les seuils;
- les roles attendus;
- le type de justification;
- les conditions de blocage;
- le niveau de risque ou de separation des roles.

Une approbation qui n'est pas resolvable a partir du contrat est invalide.

### 3. Action

Le dry-run et le dispatch doivent deriver du contrat:

- la liste des destinations autorisees;
- les templates d'action eligibles;
- les champs payload obligatoires;
- les restrictions de scope;
- les preconditions humaines ou techniques.

Le runtime n'a pas le droit d'inventer une destination ou un payload hors contrat.

### 4. Ledger

Le ledger doit conserver:

- `contract_id`
- `contract_version`
- la version de l'action template
- la decision d'approbation associee
- la methode ROI
- les notes d'override si elles existent

Sans cela, il n'y a pas de preuve economico-operationnelle defendable.

## Evenements minimum a emettre

| Evenement                  | Quand il doit exister             | Payload minimum                                      |
| -------------------------- | --------------------------------- | ---------------------------------------------------- |
| `contract.drafted`         | creation de la premiere version   | `contract_id`, `version`, `actor`                    |
| `contract.testing_started` | entree en testing                 | `contract_id`, `version`, `actor`                    |
| `contract.testing_failed`  | gate de test rouge                | `contract_id`, `version`, `reason_codes`             |
| `contract.approved`        | revue terminee                    | `contract_id`, `version`, `actor`                    |
| `contract.published`       | publication prod                  | `contract_id`, `version`, `actor`, `scope`           |
| `contract.archived`        | retrait prod                      | `contract_id`, `version`, `actor`, `reason`          |
| `contract.rolled_back`     | remplacement par revert versionne | `contract_id`, `from_version`, `to_version`, `actor` |

Les evenements doivent rester compatibles avec les schemas versionnes et l'audit append-only.

## Audit trail obligatoire

Chaque mutation gouvernee doit laisser:

- l'acteur;
- le role de l'acteur;
- l'horodatage;
- l'ancien et le nouvel etat;
- le motif structure;
- le contexte de scope;
- la reference au contrat et a sa version;
- le lien vers l'approbation ou l'action si la mutation en depend.

L'audit n'est pas un journal d'erreur.
C'est la reconstruction de la chaine de decision.

## Rollback et fork

### Rollback

Le rollback doit:

- se faire par nouvelle activation versionnee ou re-publication controlee;
- laisser intacte l'ancienne verite historique;
- recalculer ou au moins etiqueter les executions aval si elles changent de reference de contrat.

### Fork

Le fork doit servir a:

- deriver un contrat pour un nouveau scope;
- tester une variation sans modifier la version publiee;
- preparer une correction majeure sans casser l'historique.

Un fork n'herite pas implicitement de permissions de publication plus larges que son parent.

## Compatibilite obligatoire

La publication doit valider au minimum:

- compatibilite schema partage <-> runtime;
- compatibilite contrat <-> graph;
- compatibilite contrat <-> events emis;
- compatibilite contrat <-> templates d'action;
- compatibilite contrat <-> formule ROI et ledger expectations.

Si une compatibilite n'est pas prouvee, la publication echoue.

## Etats de degradation a traiter explicitement

Le `DecisionContract` doit declarer ou supporter:

- `insufficient_data`
- `stale_inputs`
- `no_feasible_solution`
- `approval_blocked`
- `dispatch_blocked`
- `cannot_prove_yet`

Ces etats ne doivent jamais etre simules comme des succes.

## Surfaces produit a aligner

| Surface            | Ce que le contrat doit y gouverner                           |
| ------------------ | ------------------------------------------------------------ |
| Contract Library   | statut, version, owner, pack, scope, rollback                |
| Contract Builder   | sections gouvernees et validation bloquante                  |
| Contract Readiness | verdicts de gate, compatibilite, warnings                    |
| Scenario Compare   | lecture de `contract_version`, explication, policies actives |
| Approval Inbox     | matrice, seuils, justification                               |
| Action Center      | destinations autorisees, template version, timeline          |
| Ledger Detail      | reference exacte du contrat et notes de gouvernance          |

## Merge evidence minimale

- tests unitaires sur lifecycle, transitions interdites, invalidation de verdicts et rules SoD;
- tests d'integration sur publish gate, rollback, compatibilite et references aval;
- tests de securite sur roles, scope, write-back permissions et audit;
- tests E2E minimum sur creation -> testing -> approval -> publish -> scenario -> approval -> action preview;
- schemas partages et docs alignes.

## Release evidence minimale

- smoke sur lecture du contrat publie et execution d'un parcours Coverage qui reference la bonne version;
- propagation des IDs `request_id`, `run_id`, `contract_version` et `action_id`;
- observabilite permettant de corriger un contrat publie sans SSH artisanal;
- runbook de retrait/rollback d'un contrat critique.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md`                       | Fermeture apportee par ce spec                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| 2. Contrats partages                       | interdit qu'une interface critique de contrat reste implicite                    |
| 5. Decision Contracts                      | rend le contrat first-class avec lifecycle, versioning, rollback et policy hooks |
| 6. Signal engine                           | force la presence de `contract_version` et d'explicabilite lisible               |
| 7. Approval & Action Mesh                  | relie matrice d'approbation, permissions de write-back et lifecycle de dispatch  |
| 8. Ledger                                  | impose la reference de contrat dans la preuve ROI et la relecture mensuelle      |
| 9. UX operationnelle                       | aligne les surfaces autour du meme objet gouverne                                |
| 10 a 12. Qualite / release / observabilite | rend la publication et le retrait d'un contrat testables et operables            |

## Decision de cadrage

Tant que ce spec n'est pas vrai dans le produit, `DecisionContract` reste un mot fort dans le PRD mais pas encore une fondation gouvernee.
Une fois ce spec vrai, Coverage cesse d'etre une juxtaposition de modules et devient une boucle decisionnelle gouvernee par contrat.
