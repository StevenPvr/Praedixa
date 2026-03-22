# `app/integrations/` - Primitives integrations tierces

## Role

Ce dossier porte les briques transverses et les premiers adaptateurs vendor-specifiques pour les connecteurs externes, distincts du runtime HTTP `app-connectors`.

## Structure

- `core/` : auth, idempotency, pagination, retry, webhooks.
- `connectors/` : adaptateurs fournisseur reel `client` / `extractor` / `mapper` / `validator`.
  - `salesforce/` : premier chemin `L2` `REST query -> raw events runtime -> dataset`.
  - `ukg/` : second chemin `L2`, `edition-aware`, base sur des endpoints UKG configures par objet metier.
  - `toast/` : troisieme chemin `L2`, base sur un header restaurant runtime et des endpoints Toast configures par objet metier.
  - `geotab/` : quatrieme chemin `L2`, base sur `Authenticate` + `GetFeed`, auth `session` et curseur `fromVersion` persiste.
  - `olo/` : cinquieme chemin `L2`, base sur des endpoints Olo configures par objet metier et un pull REST `api_key`.
    - le libelle de validation des records de reponse est centralise dans le client pour garder les erreurs homogenes.
  - `fourth/` : sixieme chemin `L2`, base sur des endpoints Fourth configures par objet metier et un pull REST `api_key`.
    - le libelle de validation des records de reponse est centralise dans le client pour garder les erreurs homogenes.
  - `oracle_tm/` : septieme chemin `L2`, base sur des endpoints Oracle TM configures par objet metier et un pull REST `oauth2`.
    - le libelle de validation des records de reponse est centralise dans le client pour garder les erreurs homogenes.
  - `sap_tm/` : huitieme chemin `L2`, base sur des endpoints SAP TM configures par objet metier et un pull REST `oauth2`.
    - le libelle de validation des records de reponse est centralise dans le client pour garder les erreurs homogenes.
  - `manhattan/` : neuvieme chemin `L2`, base sur des endpoints Manhattan configures par objet metier et un pull REST `api_key`.
    - le libelle de validation des records de reponse est centralise dans le client pour garder les erreurs homogenes.
  - `blue_yonder/` : dixieme chemin `L2`, base sur des endpoints Blue Yonder configures par objet metier et un pull REST `api_key`.
    - le libelle de validation des records de reponse est centralise dans le client pour garder les erreurs homogenes.
  - `ncr_aloha/` : onzieme chemin `L2`, base sur des endpoints NCR Aloha configures par objet metier et un pull REST `api_key`.
  - `cdk/` : douzieme chemin `L2`, base sur des endpoints CDK configures par objet metier et un pull REST `service_account` via credentials scelles.
    - le libelle de validation des records de reponse est centralise dans le client pour garder les erreurs homogenes.
  - `reynolds/` : treizieme chemin `L2`, base sur des endpoints Reynolds configures par objet metier et un pull REST `service_account` via credentials scelles.
    - le libelle de validation des records de reponse est centralise dans le client pour garder les erreurs homogenes.
- `provider_sync.py` : selection du vendor a executer pour un `sync_run` claimé.

## Positionnement

- `app-connectors` gere le control plane et l'onboarding HTTP des connexions.
- `app-api/app/services/integration_runtime_worker.py` recupere ensuite le `sync run execution plan`, choisit le chemin `provider pull` ou `sftpPull`, puis draine les raw events.
- `app-api/app/services/integration_event_ingestor.py` transforme ensuite les payloads bruts acceptes par le runtime.
- Ce dossier fournit les utilitaires partageables pour ces flux et heberge maintenant les premiers adaptateurs vendor-specifiques `Salesforce`, `UKG`, `Toast`, `Geotab`, `Olo`, `Fourth`, `Oracle TM`, `SAP TM`, `Manhattan`, `Blue Yonder`, `NCR Aloha`, `CDK` et `Reynolds`.
- `provider_sync.py` est maintenant sorti de la liste `pyright` ignoree: toute evolution du selecteur vendor doit rester compatible `strict` sans repropager de `dict[str, Any]` opaques.
- `core/auth.py`, `core/pagination.py` et `connectors/salesforce/extractor.py` sont eux aussi sortis de la liste `pyright` ignoree: toute nouvelle evolution doit y garder des payloads et curseurs dynamiques explicitement retrecis avant usage.
- `connectors/*/client.py` et `connectors/*/mapper.py` sont maintenant eux aussi sortis de la liste `pyright` ignoree: les payloads HTTP/JSON-RPC et les configs d'endpoints doivent passer par les helpers partages de `connectors/_shared/json_payloads.py` ou un narrowing explicite equivalent avant tout acces dictionnaire.
