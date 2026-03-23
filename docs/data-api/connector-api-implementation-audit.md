# Audit connecteurs - API fournisseur vs implementation repo

- Date d'audit: `2026-03-20`
- Perimetre: verification des systemes ERP/WFM/CRM/TMS/POS/DMS/telematics/SPO mentionnes ou sous-entendus dans le portefeuille connecteurs Praedixa.
- Objectif: distinguer 1) les systemes qui exposent bien une API ou une surface d'integration exploitable, 2) ce qui est vraiment implemente dans la codebase.

## Lecture rapide

- `L0`: absent du repo
- `L1`: catalogue + control plane runtime generique + surface admin
- `L1.5`: `L1` + artefact metier cible (payload/template), sans adaptateur fournisseur complet
- `L2`: adaptateur vendor-specifique reel (`client` / `extractor` / `mapper` / `validator`)

Constat global au `2026-03-20`: le repo est maintenant a `L2` pour `Salesforce`, `UKG`, `Toast`, `Geotab`, `Olo`, `Fourth`, `Oracle Transportation Management`, `SAP Transportation Management`, `Manhattan`, `Blue Yonder`, `NCR Aloha`, `CDK` et `Reynolds`, `L1` pour les autres connecteurs du catalogue standard, et `L0` pour `SharePoint Online` / `SPO` et les autres suites ERP/CRM hors catalogue.

## Preuves repo communes

- Catalogue connecteurs standard: [app-connectors/src/catalog.ts](../../app-connectors/src/catalog.ts#L13)
- Types partages cote admin/runtime: [app-api-ts/src/admin-integrations.ts](../../app-api-ts/src/admin-integrations.ts#L5), [app-api/app/models/integration.py](../../app-api/app/models/integration.py#L27)
- Test de connexion = probe HTTP generique vers `baseUrl` ou `config.testEndpoint`: [app-connectors/src/service.ts](../../app-connectors/src/service.ts#L1018)
- Trigger sync = mise en file d'un run, puis execution worker batch: [app-connectors/src/service.ts](../../app-connectors/src/service.ts#L2013), [app-api/app/services/integration_sync_queue_worker.py](../../app-api/app/services/integration_sync_queue_worker.py#L1)
- Worker Python = pont `provider pull -> raw events -> dataset`, avec mapping explicite requis via `config.datasetMapping`: [app-api/app/services/integration_runtime_worker.py](../../app-api/app/services/integration_runtime_worker.py#L1)
- Le dossier d'adaptateurs `app-api/app/integrations/connectors/<vendor>/` existe maintenant pour `Salesforce`: [app-api/app/integrations/connectors/salesforce/extractor.py](../../app-api/app/integrations/connectors/salesforce/extractor.py#L1), [app-api/app/integrations/connectors/salesforce/client.py](../../app-api/app/integrations/connectors/salesforce/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `UKG`: [app-api/app/integrations/connectors/ukg/extractor.py](../../app-api/app/integrations/connectors/ukg/extractor.py#L1), [app-api/app/integrations/connectors/ukg/client.py](../../app-api/app/integrations/connectors/ukg/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `Toast`: [app-api/app/integrations/connectors/toast/extractor.py](../../app-api/app/integrations/connectors/toast/extractor.py#L1), [app-api/app/integrations/connectors/toast/client.py](../../app-api/app/integrations/connectors/toast/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `Geotab`: [app-api/app/integrations/connectors/geotab/extractor.py](../../app-api/app/integrations/connectors/geotab/extractor.py#L1), [app-api/app/integrations/connectors/geotab/client.py](../../app-api/app/integrations/connectors/geotab/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `Olo`: [app-api/app/integrations/connectors/olo/extractor.py](../../app-api/app/integrations/connectors/olo/extractor.py#L1), [app-api/app/integrations/connectors/olo/client.py](../../app-api/app/integrations/connectors/olo/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `Fourth`: [app-api/app/integrations/connectors/fourth/extractor.py](../../app-api/app/integrations/connectors/fourth/extractor.py#L1), [app-api/app/integrations/connectors/fourth/client.py](../../app-api/app/integrations/connectors/fourth/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `Oracle TM`: [app-api/app/integrations/connectors/oracle_tm/extractor.py](../../app-api/app/integrations/connectors/oracle_tm/extractor.py#L1), [app-api/app/integrations/connectors/oracle_tm/client.py](../../app-api/app/integrations/connectors/oracle_tm/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `SAP TM`: [app-api/app/integrations/connectors/sap_tm/extractor.py](../../app-api/app/integrations/connectors/sap_tm/extractor.py#L1), [app-api/app/integrations/connectors/sap_tm/client.py](../../app-api/app/integrations/connectors/sap_tm/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `Manhattan`: [app-api/app/integrations/connectors/manhattan/extractor.py](../../app-api/app/integrations/connectors/manhattan/extractor.py#L1), [app-api/app/integrations/connectors/manhattan/client.py](../../app-api/app/integrations/connectors/manhattan/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `Blue Yonder`: [app-api/app/integrations/connectors/blue_yonder/extractor.py](../../app-api/app/integrations/connectors/blue_yonder/extractor.py#L1), [app-api/app/integrations/connectors/blue_yonder/client.py](../../app-api/app/integrations/connectors/blue_yonder/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `NCR Aloha`: [app-api/app/integrations/connectors/ncr_aloha/extractor.py](../../app-api/app/integrations/connectors/ncr_aloha/extractor.py#L1), [app-api/app/integrations/connectors/ncr_aloha/client.py](../../app-api/app/integrations/connectors/ncr_aloha/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `CDK`: [app-api/app/integrations/connectors/cdk/extractor.py](../../app-api/app/integrations/connectors/cdk/extractor.py#L1), [app-api/app/integrations/connectors/cdk/client.py](../../app-api/app/integrations/connectors/cdk/client.py#L1)
- Le meme etage d'adaptateurs existe maintenant aussi pour `Reynolds`: [app-api/app/integrations/connectors/reynolds/extractor.py](../../app-api/app/integrations/connectors/reynolds/extractor.py#L1), [app-api/app/integrations/connectors/reynolds/client.py](../../app-api/app/integrations/connectors/reynolds/client.py#L1)
- `app-connectors` expose maintenant les routes runtime internes `access-context` et `provider-events` qui ferment la frontiere de confiance fournisseur: [app-connectors/src/routes.ts](../../app-connectors/src/routes.ts#L428), [app-connectors/src/service.ts](../../app-connectors/src/service.ts#L1920)
- `app-connectors` supporte maintenant aussi l'`audience` OAuth client-credentials et des headers provider additionnels, indispensables pour `UKG` et `Toast`: [app-connectors/src/oauth.ts](../../app-connectors/src/oauth.ts#L143), [app-connectors/src/service.ts](../../app-connectors/src/service.ts#L1287)
- `app-connectors` supporte maintenant aussi un mode `session` interne et des `credentialFields` runtime scelles, indispensables pour `Geotab`: [app-connectors/src/types.ts](../../app-connectors/src/types.ts#L461), [app-connectors/src/service.ts](../../app-connectors/src/service.ts#L2040)
- Surface admin disponible pour tester/declencher les integrations: [app-admin/app/(admin)/clients/[orgId]/config/README.md](<../../app-admin/app/(admin)/clients/[orgId]/config/README.md#L21>)

## Matrice principale

| Systeme                          | Domaine                  | API fournisseur                              | Type de preuve officielle                                                             | Statut repo | Verdict implementation                                                                                                                                                                                                                                  |
| -------------------------------- | ------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Salesforce                       | CRM                      | Oui                                          | REST API + OAuth/Connected App documentes par Salesforce                              | `L2`        | Premier adaptateur reel livre: `access-context` + `provider-events` cote `app-connectors`, puis `client` / `extractor` / `mapper` / `validator` cote Python pour un pull REST query -> raw events -> dataset.                                           |
| UKG                              | WFM                      | Oui                                          | Developer Hub + OAuth token endpoint officiels                                        | `L2`        | Adaptateur reel livre avec OAuth client-credentials (`audience`), header `global-tenant-id`, endpoints edition-aware configures par objet, puis `client` / `extractor` / `mapper` / `validator` cote Python.                                            |
| Toast                            | POS                      | Oui                                          | Documentation officielle API/webhooks Toast                                           | `L2`        | Adaptateur reel livre avec header runtime `Toast-Restaurant-External-ID`, endpoints configures par objet (`Orders`, `Menus`, `Labor`, `Inventory`), puis `client` / `extractor` / `mapper` / `validator` cote Python.                                   |
| Olo                              | POS / ordering           | Probablement oui, portail dev/partenaires    | Evidence officielle publique plus limitee, portail/developer ecosystem existe         | `L2`        | Adaptateur reel livre avec auth `api_key`, endpoints configures par objet (`Orders`, `Stores`, `Products`, `Promotions`) et pull REST -> raw events -> dataset.                                                                                         |
| CDK Global                       | DMS                      | Oui, mais partenaire/gated                   | Evidence officielle Fortellis/CDK, certification partenaire requise                   | `L2`        | Adaptateur reel livre avec auth `service_account` scellee (`clientId` / `clientSecret`), endpoints configures par objet (`ServiceOrders`, `ROLines`, `Vehicle`, `Technician`) et pull REST -> raw events -> dataset; le chemin `sftpPull` reste separe. |
| Reynolds & Reynolds              | DMS                      | Probablement oui, mais tres partenaire/gated | Evidence officielle d'ecosysteme interfaces/partners, docs API publiques limitees     | `L2`        | Adaptateur reel livre avec auth `service_account` scellee (`clientId` / `clientSecret`), endpoints configures par objet (`RepairOrder`, `Customer`, `Vehicle`, `Parts`) et pull REST -> raw events -> dataset; le chemin `sftpPull` reste separe.       |
| Geotab                           | Telematics               | Oui                                          | SDK/API MyGeotab officiels                                                            | `L2`        | Adaptateur reel livre avec auth `session` MyGeotab, bootstrap `Device` via `Get`, incremental `GetFeed` sur `Trip` / `FaultData` / `StatusData` et persistance du curseur `fromVersion` par `sourceObject`.                                             |
| Fourth                           | WFM / hospitality        | Oui, mais public docs limitees               | Evidence officielle d'integration/API, acces semble tres client/partner dependent     | `L2`        | Adaptateur reel livre avec auth `api_key`, endpoints configures par objet (`Employees`, `Roster`, `Timeclock`, `LaborForecast`) et pull REST -> raw events -> dataset.                                                                                  |
| Oracle Transportation Management | TMS                      | Oui                                          | Oracle documente le REST API et OAuth pour OTM                                        | `L2`        | Adaptateur reel livre avec auth `oauth2`, endpoints configures par objet (`Shipment`, `OrderRelease`, `Route`, `Stop`) et pull REST -> raw events -> dataset.                                                                                           |
| SAP Transportation Management    | TMS                      | Oui                                          | SAP documente les APIs OData/REST pour TM                                             | `L2`        | Adaptateur reel livre avec auth `oauth2`, endpoints configures par objet (`FreightOrder`, `FreightUnit`, `Resource`, `Stop`) et pull OData/REST -> raw events -> dataset.                                                                               |
| Blue Yonder                      | Planning                 | Oui, mais perimetre/licence a confirmer      | Evidence officielle publique orientee "API-first", doc produit moins ouverte          | `L2`        | Adaptateur reel livre avec auth `api_key`, endpoints configures par objet (`DemandPlan`, `LaborPlan`, `Store`, `SKU`) et pull REST -> raw events -> dataset.                                                                                            |
| Manhattan                        | Planning / supply chain  | Oui, mais public docs limitees               | Evidence officielle d'architecture API/microservices, docs detaillees semblees gatees | `L2`        | Adaptateur reel livre avec auth `api_key`, endpoints configures par objet (`Wave`, `Task`, `Inventory`, `Shipment`) et pull REST -> raw events -> dataset.                                                                                              |
| NCR Aloha                        | POS                      | Oui selon edition                            | Guides officiels NCR/Aloha exposes, acces API dependant edition/deploiement           | `L2`        | Adaptateur reel livre avec auth `api_key`, endpoints configures par objet (`Check`, `Item`, `Labor`, `Inventory`) et pull REST -> raw events -> dataset; le chemin `sftpPull` reste separe pour les editions hybrides/on-prem.                          |
| SharePoint Online / SPO          | Collaboration / document | Oui                                          | Microsoft Graph + SharePoint REST officiels                                           | `L0`        | Aucune trace `sharepoint`, `spo` ou `microsoft graph` dans le perimetre connecteurs du repo.                                                                                                                                                            |

## Systeme hors catalogue actuel

Je n'ai trouve aucune implementation ni meme de catalogue pour ces familles dans le repo:

- `Microsoft Dynamics`
- `HubSpot`
- `NetSuite`
- `Workday`
- `Odoo`
- `Sage`
- `Cegid`
- `ServiceNow`
- `Pipedrive`
- `BambooHR`
- `Dayforce`
- `SuccessFactors`

Statut repo pour ces suites au `2026-03-19`: `L0`.

## Ecart principal entre PRD et code reel

Le PRD transverse vise un catalogue de connecteurs industrialises avec adaptateurs par vendor:

- `client.py`
- `extractor.py`
- `mapper.py`
- `validator.py`

Dans le repo reel, cet etage commence maintenant a exister. Ce qui est implemente aujourd'hui est:

1. un catalogue de vendors et de modes d'auth;
2. un control plane HTTP pour creer, tester, auditer et mettre en file des syncs;
3. une ingestion raw append-only;
4. un worker Python qui transforme des raw events en dataset seulement si le `datasetMapping` est deja configure;
5. un adaptateur `Salesforce` qui execute un vrai pull fournisseur via les routes runtime internes securisees;
6. un adaptateur `UKG` qui execute un vrai pull WFM via OAuth client-credentials et endpoints edition-aware configures par objet;
7. un adaptateur `Toast` qui execute un vrai pull POS via header restaurant runtime et endpoints configures par objet;
8. un adaptateur `Geotab` qui execute un vrai pull telematics via `Authenticate` / `GetFeed` et persistance runtime de `fromVersion`;
9. un adaptateur `Olo` qui execute un vrai pull ordering via `api_key` et endpoints configures par objet;
10. un adaptateur `Fourth` qui execute un vrai pull WFM via `api_key` et endpoints configures par objet;
11. un adaptateur `Oracle TM` qui execute un vrai pull TMS via `oauth2` et endpoints configures par objet;
12. un adaptateur `SAP TM` qui execute un vrai pull TMS via `oauth2` et endpoints configures par objet;
13. un adaptateur `Manhattan` qui execute un vrai pull supply chain via `api_key` et endpoints configures par objet;
14. un adaptateur `Blue Yonder` qui execute un vrai pull planning via `api_key` et endpoints configures par objet;
15. un adaptateur `NCR Aloha` qui execute un vrai pull POS via `api_key` et endpoints configures par objet;
16. un adaptateur `CDK` qui execute un vrai pull DMS via `service_account` scellee et endpoints configures par objet;
17. un adaptateur `Reynolds` qui execute un vrai pull DMS via `service_account` scellee et endpoints configures par objet.

En pratique, cela veut dire:

- le repo sait industrialiser la gouvernance d'une connexion;
- il sait maintenant extraire tout seul `Salesforce`, `UKG`, `Toast`, `Geotab`, `Olo`, `Fourth`, `Oracle TM`, `SAP TM`, `Manhattan`, `Blue Yonder`, `NCR Aloha`, `CDK` et `Reynolds`, mais pas encore les autres fournisseurs standard du catalogue;
- la promesse "on se branche a `X` sans redesign technique" n'est plus seulement spec pour `Salesforce`, `UKG`, `Toast`, `Geotab`, `Olo`, `Fourth`, `Oracle TM`, `SAP TM`, `Manhattan`, `Blue Yonder`, `NCR Aloha`, `CDK` et `Reynolds`, mais reste encore socle runtime + backlog d'adaptateurs pour le reste du portefeuille.

## Priorites recommandees

1. Etendre ensuite la meme logique `L2` aux vendors restant hors portefeuille ferme, en particulier de nouveaux ERP/CRM encore `L0`.
2. Pour chaque vendor prioritaire, creer le dossier reel `app-api/app/integrations/connectors/<vendor>/` prevu par le PRD.
3. Ajouter un test d'extraction live/sandbox par vendor, au lieu de ne verifier que les fixtures declaratives du catalogue.
4. Versionner un mapping canonique V1 par vendor pour supprimer la dependance a un `datasetMapping` entierement manuel.
5. Ne pas annoncer `SharePoint Online / SPO` ni les suites ERP hors catalogue comme "supportees" tant que le vendor n'existe pas au minimum au niveau `L1`.

## Sources officielles utilisees

### APIs publiques clairement confirmees

- Salesforce REST API: <https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_what_is_rest_api.htm>
- Salesforce Connected Apps / OAuth: <https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/connected_apps.htm>
- UKG Developer Hub: <https://developer.ukg.com/>
- UKG OAuth token endpoint: <https://developer.ukg.com/proplatform/reference/post_oauth-token>
- Toast API/webhooks: <https://doc.toasttab.com/doc/cookbook/apiWebhookUsageChecklist.html>
- Geotab SDK/API example: <https://geotab.github.io/sdk/software/js-samples/importUsers.html>
- Oracle Transportation Management security/API guide: <https://docs.oracle.com/en/cloud/saas/transportation/25a/otmse/security-guide.pdf>
- SAP TM security/API guide: <https://help.sap.com/doc/PRODUCTION/0a2a048b08d441c185c14ce4cac91e71/9.6.2/en-US/loiofeddae53bf3541d2937b38c4be4beafc_feddae53bf3541d2937b38c4be4beafc.pdf>
- SharePoint Online via Microsoft Graph / SharePoint REST: <https://learn.microsoft.com/en-us/sharepoint/dev/apis/sharepoint-rest-graph>

### APIs/integrations officielles mais plus fermees ou partner-gated

- Olo developer portal: <https://developer.olo.com/>
- Olo platform overview: <https://www.olo.com/hubfs/This-is-Olo_11.21.2024.pdf>
- Fortellis / CDK app launch guide: <https://community.fortellis.io/sites/default/files/Fortellis%20APP%20Launch%20Guide.pdf>
- Reynolds provider profiles: <https://www.reyrey.com/sites/reyrey.com/media/products/docs/PEN_Provider%20Profiles_Reynolds%20Feb%202018%20v2.pdf>
- Fourth integrations: <https://www.fourth.com/partner/integrations>
- Fourth SCIM API for customers: <https://help.hotschedules.com/hc/en-us/articles/360054621092-SCIM-API-for-Customers>
- Blue Yonder official "API-first" evidence: <https://fr.blueyonder.com/media/2022/asda-selects-blue-yonders-order-management-to-accelerate-its-omnichannel-transformation>
- Manhattan official API architecture evidence: <https://ir.manh.com/node/20866/pdf>
- NCR Aloha implementation guide: <https://docs-cdn.gsre.ncr.com/rest-alohatakeout/ato193_implementationguide.pdf>

## Limites de l'audit

- Certaines suites ont une documentation officielle publique tres reduite; pour celles-ci, le verdict "API oui" est parfois une inference prudente a partir d'un portail officiel, d'un guide partenaire ou d'un document officiel marketing/implementation.
- Cet audit ne prouve pas qu'un tenant client Praedixa possede les droits/licences necessaires; il confirme seulement l'existence probable ou certaine d'une surface d'integration cote fournisseur.
- Cet audit ne remplace pas une certification sandbox par vendor.
