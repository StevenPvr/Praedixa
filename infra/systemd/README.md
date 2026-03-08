# infra/systemd

Units systemd versionnees pour les composants operes en dehors des apps web.

## Fichier present

- `praedixa-medallion.service` lance l'orchestrateur Python de pipeline medallion.

## Contexte

Ce dossier concerne la data platform Python. Il ne sert pas aux parcours frontend, BFF ou auth Next.js.

## Workflow typique

Apres installation sur un hote:

```bash
sudo cp infra/systemd/praedixa-medallion.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now praedixa-medallion.service
sudo systemctl status praedixa-medallion.service
```

## Attention

- Verifier les chemins de `WorkingDirectory` et les volumes autorises avant de deployer.
- Toute evolution du service doit rester coherente avec `app-api` et ses scripts d'orchestration Python.
