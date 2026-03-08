# Sécurité

Ce dossier rassemble la documentation de sécurité et de conformité de Praedixa.

## Contenu

- posture globale, risques résiduels, checklist RGPD et classification PII ;
- modèle de menace STRIDE ;
- pack de conformité ;
- invariants de sécurité machine-lisibles.

## Sous-dossiers

- `compliance-pack/` : base documentaire conformité / trust pack.
- `invariants/` : fichiers YAML décrivant les contrôles et abus à prévenir.

## Lien avec le code

- Les scripts de gate et de vérification de `scripts/` utilisent ou reflètent ces exigences.
- Les README locaux des apps doivent décrire comment auth, autorisation, rate limiting et contrôle d'origine sont implémentés.
