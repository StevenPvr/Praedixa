"""Column Mapper — maps source file headers to dataset column definitions.

Three-layer matching strategy:
1. Format-specific aliases (Lucca, PayFit CSV headers -> normalized names)
2. Fuzzy normalization (strip accents, lowercase, underscores, trim)
3. Exact match (source == target after normalization)

Security notes:
- Source column names come from user-uploaded files and are treated as
  untrusted input. They are NEVER used directly in SQL — only the
  validated target column names from DatasetColumn definitions are used.
- Confidence scores are clamped to [0.0, 1.0].
- No regex compilation from user input (all patterns are hardcoded).
"""

from __future__ import annotations

import logging
import unicodedata
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Final

if TYPE_CHECKING:
    from collections.abc import Callable

    from app.models.data_catalog import DatasetColumn

logger = logging.getLogger(__name__)

__all__ = ["ColumnMapping", "map_columns", "MappingResult"]


def _empty_string_list() -> list[str]:
    return []

# ── Format-specific alias dictionaries ──────────────────

# Lucca HR/absence CSV headers -> normalized column names.
_LUCCA_ALIASES: Final[dict[str, str]] = {
    "collaborateur": "nom_complet",
    "nom du collaborateur": "nom_complet",
    "matricule": "matricule",
    "type de conge": "type_absence",
    "type d'absence": "type_absence",
    "type absence": "type_absence",
    "date de debut": "date_debut",
    "date debut": "date_debut",
    "date de fin": "date_fin",
    "date fin": "date_fin",
    "duree": "duree",
    "duree (jours)": "duree",
    "service": "departement",
    "departement": "departement",
    "manager": "manager",
    "responsable": "manager",
    "statut": "statut",
    "etat": "statut",
    "commentaire": "commentaire",
    "motif": "motif",
    "solde conge": "solde_conge",
    "solde": "solde_conge",
}

# PayFit payroll CSV headers -> normalized column names.
_PAYFIT_ALIASES: Final[dict[str, str]] = {
    "nom": "nom",
    "prenom": "prenom",
    "matricule": "matricule",
    "salaire brut": "salaire_brut",
    "salaire net": "salaire_net",
    "net a payer": "net_a_payer",
    "net à payer": "net_a_payer",
    "hs 25%": "heures_sup_25",
    "hs 50%": "heures_sup_50",
    "heures supplementaires": "heures_supplementaires",
    "heures supplémentaires": "heures_supplementaires",
    "conges payes": "conges_payes",
    "congés payés": "conges_payes",
    "primes": "primes",
    "prime": "primes",
    "cotisations": "cotisations",
    "cotisations salariales": "cotisations",
    "date embauche": "date_embauche",
    "date d'embauche": "date_embauche",
    "poste": "poste",
    "fonction": "poste",
    "service": "departement",
    "departement": "departement",
    "département": "departement",
    "site": "site",
    "etablissement": "site",
    "établissement": "site",
}

# Sage accounting FEC/CSV headers -> normalized column names.
_SAGE_ALIASES: Final[dict[str, str]] = {
    "journalcode": "journal_code",
    "journallib": "journal_lib",
    "ecriturenum": "ecriture_num",
    "ecrituredate": "date_ecriture",
    "comptenum": "compte_num",
    "comptelib": "compte_lib",
    "compauxnum": "compte_aux_num",
    "compauxlib": "compte_aux_lib",
    "pieceref": "piece_ref",
    "piecedate": "date_piece",
    "ecriturelib": "libelle_ecriture",
    "debit": "debit",
    "credit": "credit",
    "ecrturelet": "lettrage",
    "datelet": "date_lettrage",
    "validdate": "date_validation",
    "montantdevise": "montant_devise",
    "idevise": "devise",
    "numpiece": "num_piece",
    "datepiece": "date_piece",
    "numcompte": "compte_num",
    "montantht": "montant_ht",
    "tauxtva": "taux_tva",
    "montanttva": "montant_tva",
    "montantttc": "montant_ttc",
    "echeance": "date_echeance",
    "modepaiement": "mode_paiement",
    "type": "type_piece",
}

# Confidence thresholds for match quality.
_CONFIDENCE_ALIAS: Final[float] = 0.95  # Format-specific alias match
_CONFIDENCE_NORMALIZED: Final[float] = 0.80  # Fuzzy normalized match
_CONFIDENCE_EXACT: Final[float] = 1.0  # Perfect exact match


# ── Result dataclasses ───────────────────────────────────


@dataclass(frozen=True)
class ColumnMapping:
    """A single source-to-target column mapping."""

    source_column: str
    target_column: str
    confidence: float  # 0.0 to 1.0
    transform: Callable[[Any], Any] | None = None


@dataclass(frozen=True)
class MappingResult:
    """Complete mapping result with matched and unmatched columns."""

    mappings: list[ColumnMapping]
    unmapped_source: list[str] = field(default_factory=_empty_string_list)
    unmapped_target: list[str] = field(default_factory=_empty_string_list)
    warnings: list[str] = field(default_factory=_empty_string_list)


# ── Public API ───────────────────────────────────────────


def map_columns(
    source_columns: list[str],
    dataset_columns: list[DatasetColumn],
    *,
    format_hint: str | None = None,
) -> MappingResult:
    """Map source file columns to dataset column definitions.

    Uses a three-layer matching strategy:
    1. Format-specific aliases (Lucca, PayFit) — highest priority
    2. Fuzzy normalization (accent strip, lowercase, underscore) — medium
    3. Exact match on normalized form — fallback

    Args:
        source_columns: Column headers from the parsed file.
        dataset_columns: DatasetColumn definitions from the database.
        format_hint: Detected format ("lucca", "payfit", "csv", "xlsx").

    Returns:
        MappingResult with mappings, unmapped sources/targets, and warnings.
    """
    # Build target lookup: normalized_name -> DatasetColumn.name
    target_names = {col.name for col in dataset_columns}
    target_normalized: dict[str, str] = {
        _normalize(col.name): col.name for col in dataset_columns
    }

    # Select alias dict based on format
    aliases: dict[str, str] = {}
    if format_hint == "lucca":
        aliases = _LUCCA_ALIASES
    elif format_hint == "payfit":
        aliases = _PAYFIT_ALIASES
    elif format_hint == "sage":
        aliases = _SAGE_ALIASES

    mappings: list[ColumnMapping] = []
    matched_targets: set[str] = set()
    unmapped_source: list[str] = []
    warnings: list[str] = []

    for src_col in source_columns:
        mapping = _match_column(
            src_col,
            target_names=target_names,
            target_normalized=target_normalized,
            aliases=aliases,
            matched_targets=matched_targets,
        )

        if mapping is not None:
            mappings.append(mapping)
            matched_targets.add(mapping.target_column)
        else:
            unmapped_source.append(src_col)
            warnings.append(f"Source column '{src_col}' could not be mapped")

    # Find unmatched target columns
    unmapped_target = sorted(target_names - matched_targets)
    if unmapped_target:
        warnings.append(
            f"Target columns without source mapping: {', '.join(unmapped_target)}"
        )

    return MappingResult(
        mappings=mappings,
        unmapped_source=unmapped_source,
        unmapped_target=unmapped_target,
        warnings=warnings,
    )


# ── Private helpers ──────────────────────────────────────


def _normalize(name: str) -> str:
    """Normalize a column name for fuzzy matching.

    Strips accents, lowercases, replaces whitespace/hyphens with underscores,
    removes non-alphanumeric characters (except underscores).
    """
    # Strip accents via NFD decomposition
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_only = "".join(c for c in nfkd if not unicodedata.combining(c))

    # Lowercase + replace whitespace/hyphens with underscores
    result = ascii_only.lower().strip()
    result = result.replace(" ", "_").replace("-", "_").replace("'", "")

    # Remove non-alphanumeric (except underscore)
    result = "".join(c for c in result if c.isalnum() or c == "_")

    # Collapse multiple underscores
    while "__" in result:
        result = result.replace("__", "_")

    return result.strip("_")


def _match_column(
    source_col: str,
    *,
    target_names: set[str],
    target_normalized: dict[str, str],
    aliases: dict[str, str],
    matched_targets: set[str],
) -> ColumnMapping | None:
    """Try to match a single source column to a target.

    Strategy order:
    1. Exact match (source == target)
    2. Format-specific alias lookup
    3. Fuzzy normalized match
    """
    src_normalized = _normalize(source_col)

    # Strategy 1: Exact match
    if source_col in target_names and source_col not in matched_targets:
        return ColumnMapping(
            source_column=source_col,
            target_column=source_col,
            confidence=_CONFIDENCE_EXACT,
        )

    # Strategy 2: Format-specific alias
    src_lower = source_col.lower().strip()
    if aliases:
        alias_target = aliases.get(src_lower) or aliases.get(src_normalized)
        if (
            alias_target
            and alias_target in target_names
            and alias_target not in matched_targets
        ):
            return ColumnMapping(
                source_column=source_col,
                target_column=alias_target,
                confidence=_CONFIDENCE_ALIAS,
            )

    # Strategy 3: Fuzzy normalized match
    if src_normalized in target_normalized:
        target = target_normalized[src_normalized]
        if target not in matched_targets:
            return ColumnMapping(
                source_column=source_col,
                target_column=target,
                confidence=_CONFIDENCE_NORMALIZED,
            )

    return None
