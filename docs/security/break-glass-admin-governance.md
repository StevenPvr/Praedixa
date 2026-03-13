# Gouvernance Break-Glass Admin

## But

Le break-glass sert a restaurer ou contenir un incident quand le chemin admin normal ne permet plus d'agir dans le delai requis. Ce n'est pas un raccourci pour l'exploitation courante, le support standard ou une mise en production.

## Cas d'usage autorises

- indisponibilite du SSO, du MFA ou d'un chemin admin critique ;
- compromission suspectee demandant revocation, rotation ou isolation immediate ;
- corruption des metadonnees critiques bloquant l'acces normal ;
- incident P1 ou equivalent avec impact client ou securite.

Usages interdits :

- confort operateur ;
- maintenance planifiee ;
- contourner une revue, un controle d'origine ou une segregation de roles.

## Identite d'urgence et controles

- identite dediee, distincte des comptes nominatifs quotidiens ;
- secret conserve dans le secret manager sous double controle ;
- MFA obligatoire en production, meme en mode break-glass ;
- session courte, scope minimal et fermeture explicite ;
- permission `cp.break-glass` non assignee hors urgence.

## Journalisation obligatoire

Sans journal, pas d'usage conforme. Les evenements suivants vont dans le journal append-only :

- ouverture : incident, demandeur, approbateur, motif, heure UTC ;
- activation : operateur, identite utilisee, poste gere ou bastion, `request_id` initial ;
- chaque action critique : route, operation, objet cible, justification, resultat ;
- acces ou rotation de secret ;
- fermeture : heure UTC, etat final, rotations effectuees, liens vers les preuves.

Champs minimaux :

- `incident_id`, `event_id`, `occurred_at_utc`, `request_id` ;
- `requester_id`, `approver_id`, `operator_id` ;
- `route`, `operation`, `target_type`, `target_id` ;
- `justification`, `outcome`, `break_glass=true`.

## Procedure

1. Ouvrir un incident et confirmer qu'aucun chemin admin normal ne permet une action assez rapide.
2. Obtenir l'accord de l'astreinte service et d'un approbateur securite ou direction technique. Si impossible dans l'urgence, l'approbation retroactive est due sous 24 h.
3. Recuperer l'acces d'urgence via le secret manager, activer la session avec MFA et journaliser l'activation.
4. Executer le minimum d'actions necessaires : confinement, revocation, rotation, restauration de metadonnees ou remise en etat.
5. Fermer la session, revoquer les sessions temporaires, tourner les secrets utilises et journaliser la cloture.

## Actions post-incident

- revue de toutes les mutations effectuees sous break-glass au plus tard le jour ouvre suivant ;
- rotation obligatoire de tout secret expose ou manipule ;
- verification du diff des metadonnees critiques et conservation des preuves ;
- retro avec actions correctives pour reduire le recours au break-glass.
