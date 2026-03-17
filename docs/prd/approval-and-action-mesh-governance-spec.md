# Approval And Action Mesh Governance Spec

## Role de ce document

Ce document ferme le trou documentaire entre:

- la gouvernance du `DecisionContract`;
- la boucle runtime `approve -> dispatch`;
- la fiabilite du write-back;
- les cases ouvertes de `TODO.md` sur matrice d'approbation, justification structuree, SoD, idempotence, sandbox et actions composites.

Il ne remplace pas:

- `docs/prd/decision-contract-governed-publish-spec.md` pour le lifecycle du contrat et ses gates de publication;
- `docs/prd/decisionops-operating-loop-spec.md` pour le parcours quotidien et les surfaces UX;
- `docs/prd/control-plane-trust-gate-spec.md` pour le trust gate auth/RBAC/audit.

Il fixe le contrat de build du noyau encore ouvert cote execution gouvernee:

- matrice d'approbation configurable par contrat et risque;
- justification structuree sur tout le flux;
- separation des roles pour publications et approbations critiques;
- `Action Mesh` idempotent, sandboxable et observable;
- orchestration d'actions composites sans doublon silencieux.

## Pourquoi ce document existe

Le repo a deja:

- une persistance reelle des `decision_approvals` et `action_dispatches`;
- une inbox d'approbation actionnable;
- un detail dispatch persistant;
- un lifecycle principal `dry-run -> dispatch -> acknowledged -> failed -> retried -> canceled`;
- des permissions de write-back par contrat et destination;
- un fallback humain explicite.

Le principal gap restant n'est plus de dire "une action peut partir".
Le gap est de rendre impossible que:

- une approbation critique parte sans matrice gouvernee explicite;
- une justification soit capturee a un endroit mais perdue plus loin dans le flux;
- un retry ou une orchestration multi-destination ecrive deux fois;
- une destination sensible soit pilotee sans sandbox claire;
- la publication d'un contrat critique et son approbation operationnelle s'appuient sur le meme acteur sans garde-fou.

## Sources de verite

- `docs/prd/Praedixa_PRD_DecisionOps_PRD_final.md`
- `docs/prd/TODO.md`
- `docs/prd/decision-contract-governed-publish-spec.md`
- `docs/prd/decisionops-operating-loop-spec.md`
- `docs/prd/control-plane-trust-gate-spec.md`
- `docs/prd/decisionops-v1-execution-backbone.md`
- `docs/prd/matrice-verification-parcours-confiance.md`

## Resultat attendu

La couche `approval + Action Mesh` est credible quand le produit sait:

1. determiner qui doit valider quoi selon contrat, perimetre, cout, risque et destination;
2. capturer et relire une justification structuree sur approve, reject, override, retry et fallback;
3. empecher les conflits de roles sur publication et approbation critiques;
4. dispatcher une action sans doublon silencieux meme en cas de retry ou d'echec partiel;
5. tester les destinations sensibles sans effet irreversible;
6. orchestrer plusieurs actions liees dans un flux critique sans perdre l'audit.

## Frontiere de responsabilite

| Objet                    | Ce qu'il doit garantir                                  | Ce qu'il ne doit pas devenir                                |
| ------------------------ | ------------------------------------------------------- | ----------------------------------------------------------- |
| Approval matrix          | qui doit valider quoi, quand et pourquoi                | un simple champ libre interprete differemment selon l'ecran |
| Structured justification | le motif gouverne de chaque decision humaine ou systeme | un commentaire libre non exploitable a l'aval               |
| Action template          | le contrat d'ecriture vers une destination              | un payload ad hoc reconstruit dans chaque page              |
| Action dispatch          | l'execution d'une ecriture ou d'une action gouvernee    | un simple appel HTTP sans timeline ni idempotence           |
| Composite action         | une orchestration ordonnee de plusieurs actions liees   | une suite de side effects non correlables                   |
| Sandbox                  | un mode d'essai explicite sans effet irreversible       | un pseudo dry-run qui touche tout de meme la prod cible     |

## Matrice d'approbation configurable

La matrice d'approbation doit pouvoir se resoudre a partir de:

- `contract_id` et `contract_version`;
- type d'action ou destination;
- niveau de risque;
- cout ou impact attendu;
- perimetre organisationnel;
- mode runtime (`shadow`, `sandbox`, `prod`).

La resolution doit indiquer explicitement:

- si une approbation est requise;
- quels roles ou groupes sont eligibles;
- si plusieurs validations sont requises;
- le type de justification attendu;
- le delai ou niveau d'urgence;
- les raisons de blocage si la matrice ne se resout pas.

Une action qui ne peut pas resoudre sa matrice d'approbation reste bloquee.

## Justification structuree

Les justifications doivent etre structurees au minimum pour:

- `approve`;
- `reject`;
- `override`;
- `retry`;
- `fallback_prepare`;
- `fallback_execute`;
- `cancel`.

Chaque justification doit conserver:

- un code de raison;
- un commentaire libre si necessaire;
- l'acteur;
- le contexte `contract/run/action`;
- le niveau de risque ou de deviation;
- la date et la revision de flux.

La justification ne doit pas etre capturee une seule fois puis perdue:

- elle doit rester relisible dans l'approbation;
- elle doit se propager au dispatch si elle est pertinente;
- elle doit rester visible dans le ledger et l'audit quand elle change le sens economico-operationnel.

## Separation des roles

La SoD minimale doit empecher:

- qu'un meme acteur publie seul un contrat critique puis l'approuve operationnellement sans seconde ligne de defense;
- qu'une elevation de privilege locale contourne la matrice;
- qu'une exception SoD ne soit pas auditee et motivee.

Ce spec distingue deux frontieres:

- publication critique de contrat;
- approbation critique de recommendation ou write-back.

Si une exception SoD est acceptee:

- elle doit etre policy-driven;
- limitee;
- motivee;
- append-only auditee.

## Lifecycle Action Mesh

Le lifecycle principal reste:

- `dry-run`;
- `pending`;
- `dispatched`;
- `acknowledged`;
- `failed`;
- `retried`;
- `canceled`.

Mais il doit aussi savoir rendre lisibles:

- `fallback_prepared`;
- `fallback_executed`;
- `sandbox_only`;
- `composite_partial`.

Chaque transition doit preciser:

- qui l'a declenchee;
- avec quelle justification;
- si elle est reversible;
- quel est le prochain etat autorise.

## Idempotence de bout en bout

L'idempotence ne s'arrete pas a l'insertion d'un dispatch.
Elle doit couvrir:

- le dry-run devenu dispatch;
- le retry d'une action echouee;
- le fallback humain si le write-back a deja partiellement eu lieu;
- l'orchestration de plusieurs destinations;
- les callbacks ou acknowledgements tardifs.

Le systeme doit pouvoir distinguer:

- un retry legitime;
- un doublon silencieux;
- une reprise partielle;
- une action deja executee cote destination.

Une demande de retry ne doit jamais pouvoir ecrire deux fois sans signal clair.

## Sandbox et mode test

Les destinations sensibles doivent declarer explicitement:

- si la sandbox existe;
- si le dry-run est purement local ou adosse a une vraie cible de test;
- quelles limites de payload ou de perimetre s'appliquent;
- si un pilote peut lancer un test sans effet irreversible.

Une destination sans sandbox:

- doit le dire clairement;
- ne doit pas se presenter comme testable en conditions sures;
- peut exiger un mode `shadow` ou un perimetre ultra-controle.

## Actions composites orchestrees

Les actions composites sont necessaires quand une decision critique impose:

- plusieurs destinations;
- un ordre;
- des preconditions;
- des compensations ou blocages inter-etapes.

Une action composite doit conserver:

- un identifiant parent;
- les dispatch enfants;
- l'ordre d'execution;
- le statut agrege;
- les compensations ou blocages;
- les justifications associees.

Le produit ne doit pas presenter une orchestration multi-destination comme une seule action simple si cela masque le risque ou la reprise.

## Surfaces produit a aligner

| Surface          | Ce qu'elle doit montrer                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| Approval inbox   | matrice resolue, urgence, justification requise, blocages               |
| Scenario compare | si l'action est directe, soumise a approbation, ou bloquee              |
| Action detail    | timeline, idempotence, retry eligibility, sandbox, fallback             |
| Contract Studio  | seuils, destinations, politiques de publication et d'action             |
| Ledger detail    | justification finale, override, statut d'execution, version de template |

## Merge evidence minimale

- tests unitaires sur resolution de matrice, transitions interdites et justifications structurees;
- tests d'integration sur approval mutation, decision cascade, dispatch transitions et sandbox flags;
- tests de securite sur SoD, permissions de destination et write-back restrictions;
- tests de regression d'idempotence et de prevention de doublons;
- verification qu'une action composite reste correlable et relisible.

## Release evidence minimale

- smoke sur approval inbox, action detail et fallback/sandbox quand applicable;
- preuve qu'un retry ne double pas une ecriture sur un cas pilote;
- traces corrigeables via `request_id`, `run_id`, `contract_version`, `action_id`;
- runbook de reprise ou fallback sur destination sensible.

## Interpretation du TODO.md a travers ce spec

| Section du `TODO.md`                                 | Fermeture apportee                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 7. Approval workflow, Action Mesh et execution plane | matrice d'approbation, justification structuree, SoD, idempotence, composites, sandbox |
| 5. Decision Contracts                                | relie les hooks de policy et la SoD a l'execution reelle                               |
| 8. Ledger                                            | propage approbations, overrides et statuts d'action jusqu'a la preuve                  |
| 9. UX operationnelle                                 | stabilise ce que les surfaces approval/action doivent rendre lisible                   |

## Ordre de fermeture recommande

1. figer la resolution de matrice d'approbation par contrat et risque;
2. standardiser la justification structuree sur tout le flux;
3. fermer la SoD critique entre publication et approbation;
4. durcir l'idempotence end-to-end et les retries;
5. ajouter sandbox et orchestration composite avec preuves merge/release.

## Decision de cadrage

Tant que ce spec n'est pas vrai, Praedixa peut dispatcher des actions utiles, mais ne ferme pas encore completement sa promesse de write-back gouverne, explicable, rejouable et sans doublon silencieux sur les cas critiques.
