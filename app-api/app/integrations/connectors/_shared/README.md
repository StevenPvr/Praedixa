# `_shared`

Ce dossier regroupe uniquement des helpers minimaux reutilisables par plusieurs extracteurs de connecteurs.

- `batch_ingest.py` centralise le pattern commun `chunk -> ingest_provider_events -> cumul accepted/duplicates`.
- `json_payloads.py` centralise les helpers de narrowing JSON (`require_object`, `require_record_sequence`, `get_path`) pour fermer le bruit `pyright` sur les payloads runtime et HTTP.
- Le helper reste volontairement bas niveau: il ne connait ni le mapping fournisseur ni les politiques de pagination.
- `geotab` n'est pas migre ici dans cette passe afin d'eviter de melanger ce refactor avec sa logique de watermark et `sync_run_state`.
