# `app/schemas/` - Schemas Pydantic Python

## Role

Schemas de validation encore utilises cote Python.

## Contenu actuel

- `mlops.py` : payloads et structures liees aux workflows MLOps.

## Positionnement

Le dossier est leger aujourd'hui: l'essentiel du domaine persistant vit dans `models/`, et les scripts batch travaillent surtout sur dataclasses, modeles SQLAlchemy et helpers de services.

## Regle

Les payloads schema doivent rester precisement types (`dict[str, Any]`, unions bornees, etc.) pour ne pas diluer les contrats MLOps dans des shapes implicites.
