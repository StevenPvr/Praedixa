"""Tests for Column Mapper service.

Covers:
- Exact match mapping (source == target name)
- Lucca alias mapping with confidence score (both lower and normalized lookup)
- PayFit alias mapping with confidence score
- Fuzzy normalization (accents, case, underscores, hyphens, apostrophes)
- Unmapped columns generate warnings (not errors)
- Confidence score levels (1.0 exact, 0.95 alias, 0.80 fuzzy)
- Empty source/target column lists
- Duplicate target prevention (first source wins)
- Alias target not in target_names -> fallback to fuzzy
- Alias target already matched -> skip, try next strategy
- Exact match already matched -> skip, try next strategy
- MappingResult / ColumnMapping dataclass fields
- _normalize: accent stripping, apostrophe removal, collapse underscores, etc.
"""

from types import SimpleNamespace

import pytest

from app.services.column_mapper import (
    ColumnMapping,
    MappingResult,
    _normalize,
    map_columns,
)

# ── Helpers ──────────────────────────────────────────────


def _make_dataset_column(
    name: str,
    dtype: str = "text",
    role: str = "feature",
) -> SimpleNamespace:
    """Create a minimal DatasetColumn-like object."""
    return SimpleNamespace(name=name, dtype=dtype, role=role)


# ── _normalize ───────────────────────────────────────────


class TestNormalize:
    def test_lowercase(self) -> None:
        assert _normalize("NOM") == "nom"

    def test_strip_accents(self) -> None:
        assert _normalize("prénom") == "prenom"

    def test_replace_spaces(self) -> None:
        assert _normalize("first name") == "first_name"

    def test_replace_hyphens(self) -> None:
        assert _normalize("last-name") == "last_name"

    def test_strip_apostrophes(self) -> None:
        assert _normalize("type d'absence") == "type_dabsence"

    def test_collapse_underscores(self) -> None:
        assert _normalize("a__b___c") == "a_b_c"

    def test_strip_leading_trailing_underscores(self) -> None:
        assert _normalize("_name_") == "name"

    def test_strip_non_alphanumeric(self) -> None:
        assert _normalize("col (%)") == "col"

    def test_complex_french_header(self) -> None:
        assert _normalize("Durée (jours)") == "duree_jours"

    def test_empty_string(self) -> None:
        assert _normalize("") == ""

    def test_only_special_chars(self) -> None:
        assert _normalize("(%)") == ""

    def test_mixed_accents_and_hyphens(self) -> None:
        assert _normalize("Salaire-Brut-Mensuel") == "salaire_brut_mensuel"

    def test_unicode_normalization(self) -> None:
        # \u00e9 (precomposed é) == e + combining accent (NFKD)
        assert _normalize("\u00e9") == "e"

    def test_digits_preserved(self) -> None:
        assert _normalize("HS 25%") == "hs_25"

    def test_multiple_spaces(self) -> None:
        assert _normalize("a  b   c") == "a_b_c"


# ── Exact match ──────────────────────────────────────────


class TestExactMatch:
    def test_exact_match(self) -> None:
        cols = [_make_dataset_column("nom"), _make_dataset_column("age")]
        result = map_columns(["nom", "age"], cols)

        assert isinstance(result, MappingResult)
        assert len(result.mappings) == 2
        assert result.mappings[0].source_column == "nom"
        assert result.mappings[0].target_column == "nom"
        assert result.mappings[0].confidence == 1.0
        assert result.mappings[1].target_column == "age"

    def test_no_unmapped(self) -> None:
        cols = [_make_dataset_column("nom")]
        result = map_columns(["nom"], cols)
        assert len(result.unmapped_source) == 0
        assert len(result.unmapped_target) == 0

    def test_exact_match_dedup(self) -> None:
        """Two source columns with the same name: only first gets exact match,
        second becomes unmapped (since target is already matched)."""
        cols = [_make_dataset_column("nom")]
        result = map_columns(["nom", "nom"], cols)
        # First "nom" gets exact match
        assert len(result.mappings) == 1
        assert result.mappings[0].confidence == 1.0
        # Second "nom" is unmapped (target already taken)
        assert "nom" in result.unmapped_source


# ── Lucca aliases ────────────────────────────────────────


class TestLuccaAliases:
    def test_collaborateur_maps_to_nom_complet(self) -> None:
        cols = [_make_dataset_column("nom_complet")]
        result = map_columns(
            ["Collaborateur"],
            cols,
            format_hint="lucca",
        )
        assert len(result.mappings) == 1
        assert result.mappings[0].target_column == "nom_complet"
        assert result.mappings[0].confidence == pytest.approx(0.95)

    def test_type_de_conge_maps_to_type_absence(self) -> None:
        cols = [_make_dataset_column("type_absence")]
        result = map_columns(
            ["Type de conge"],
            cols,
            format_hint="lucca",
        )
        assert result.mappings[0].target_column == "type_absence"

    def test_multiple_lucca_mappings(self) -> None:
        cols = [
            _make_dataset_column("nom_complet"),
            _make_dataset_column("matricule"),
            _make_dataset_column("type_absence"),
        ]
        result = map_columns(
            ["Collaborateur", "Matricule", "Type de conge"],
            cols,
            format_hint="lucca",
        )
        assert len(result.mappings) == 3
        assert len(result.unmapped_source) == 0

    def test_lucca_alias_not_applied_without_hint(self) -> None:
        """Without format_hint='lucca', alias should not be used."""
        cols = [_make_dataset_column("nom_complet")]
        result = map_columns(
            ["Collaborateur"],
            cols,
            format_hint="csv",
        )
        # "Collaborateur" doesn't match "nom_complet" exactly or normalized
        assert len(result.mappings) == 0
        assert "Collaborateur" in result.unmapped_source

    def test_lucca_alias_target_not_in_dataset(self) -> None:
        """If alias maps to a target not in dataset_columns, skip alias."""
        cols = [_make_dataset_column("some_other_col")]
        result = map_columns(
            ["Collaborateur"],  # alias -> nom_complet, but nom_complet not in targets
            cols,
            format_hint="lucca",
        )
        assert len(result.mappings) == 0
        assert "Collaborateur" in result.unmapped_source

    def test_lucca_alias_target_already_matched(self) -> None:
        """If alias target is already matched by earlier source, skip alias."""
        cols = [_make_dataset_column("nom_complet")]
        # First source matches directly (exact), second tries alias to same target
        result = map_columns(
            ["nom_complet", "Collaborateur"],
            cols,
            format_hint="lucca",
        )
        assert len(result.mappings) == 1
        assert result.mappings[0].source_column == "nom_complet"
        assert result.mappings[0].confidence == 1.0  # exact match
        assert "Collaborateur" in result.unmapped_source

    def test_lucca_service_maps_to_departement(self) -> None:
        cols = [_make_dataset_column("departement")]
        result = map_columns(["Service"], cols, format_hint="lucca")
        assert result.mappings[0].target_column == "departement"

    def test_lucca_etat_maps_to_statut(self) -> None:
        cols = [_make_dataset_column("statut")]
        result = map_columns(["Etat"], cols, format_hint="lucca")
        assert result.mappings[0].target_column == "statut"


# ── PayFit aliases ───────────────────────────────────────


class TestPayFitAliases:
    def test_salaire_brut_maps(self) -> None:
        cols = [_make_dataset_column("salaire_brut")]
        result = map_columns(
            ["Salaire brut"],
            cols,
            format_hint="payfit",
        )
        assert result.mappings[0].target_column == "salaire_brut"
        assert result.mappings[0].confidence == pytest.approx(0.95)

    def test_net_a_payer_maps(self) -> None:
        cols = [_make_dataset_column("net_a_payer")]
        result = map_columns(
            ["Net a payer"],
            cols,
            format_hint="payfit",
        )
        assert result.mappings[0].target_column == "net_a_payer"

    def test_net_a_payer_with_accent_maps(self) -> None:
        """'net \u00e0 payer' (with accent) is also in _PAYFIT_ALIASES."""
        cols = [_make_dataset_column("net_a_payer")]
        result = map_columns(
            ["Net \u00e0 payer"],
            cols,
            format_hint="payfit",
        )
        assert result.mappings[0].target_column == "net_a_payer"

    def test_hs_25_percent_maps(self) -> None:
        cols = [_make_dataset_column("heures_sup_25")]
        result = map_columns(
            ["HS 25%"],
            cols,
            format_hint="payfit",
        )
        assert result.mappings[0].target_column == "heures_sup_25"

    def test_payfit_etablissement_maps_to_site(self) -> None:
        cols = [_make_dataset_column("site")]
        result = map_columns(["\u00c9tablissement"], cols, format_hint="payfit")
        assert result.mappings[0].target_column == "site"

    def test_payfit_departement_with_accent(self) -> None:
        cols = [_make_dataset_column("departement")]
        result = map_columns(["D\u00e9partement"], cols, format_hint="payfit")
        assert result.mappings[0].target_column == "departement"


# ── Fuzzy normalization ──────────────────────────────────


class TestFuzzyNormalization:
    def test_accent_match(self) -> None:
        """Source 'Pr\u00e9nom' should match target 'prenom' via normalization."""
        cols = [_make_dataset_column("prenom")]
        result = map_columns(["Pr\u00e9nom"], cols)
        assert len(result.mappings) == 1
        assert result.mappings[0].confidence == pytest.approx(0.80)

    def test_case_match(self) -> None:
        cols = [_make_dataset_column("nom")]
        result = map_columns(["NOM"], cols)
        assert len(result.mappings) == 1

    def test_space_to_underscore_match(self) -> None:
        cols = [_make_dataset_column("date_debut")]
        result = map_columns(["date debut"], cols)
        assert len(result.mappings) == 1

    def test_hyphen_to_underscore_match(self) -> None:
        cols = [_make_dataset_column("code_postal")]
        result = map_columns(["code-postal"], cols)
        assert len(result.mappings) == 1

    def test_fuzzy_match_dedup(self) -> None:
        """If normalized target already matched, second source is unmapped."""
        cols = [_make_dataset_column("nom")]
        result = map_columns(["Nom", "NOM"], cols)
        # First "Nom" matches via fuzzy (not exact since case differs)
        assert len(result.mappings) == 1
        assert len(result.unmapped_source) == 1

    def test_apostrophe_stripped_for_fuzzy(self) -> None:
        cols = [_make_dataset_column("type_dabsence")]
        result = map_columns(["type d'absence"], cols)
        assert len(result.mappings) == 1
        assert result.mappings[0].confidence == pytest.approx(0.80)


# ── Unmapped columns ─────────────────────────────────────


class TestUnmappedColumns:
    def test_unmapped_source_generates_warning(self) -> None:
        cols = [_make_dataset_column("nom")]
        result = map_columns(["nom", "extra_col"], cols)
        assert "extra_col" in result.unmapped_source
        assert any("extra_col" in w for w in result.warnings)

    def test_unmapped_target_generates_warning(self) -> None:
        cols = [
            _make_dataset_column("nom"),
            _make_dataset_column("age"),
        ]
        result = map_columns(["nom"], cols)
        assert "age" in result.unmapped_target
        assert any("age" in w for w in result.warnings)

    def test_all_unmapped(self) -> None:
        cols = [_make_dataset_column("target_a")]
        result = map_columns(["source_x"], cols)
        assert len(result.mappings) == 0
        assert "source_x" in result.unmapped_source
        assert "target_a" in result.unmapped_target

    def test_unmapped_target_sorted(self) -> None:
        cols = [
            _make_dataset_column("z_col"),
            _make_dataset_column("a_col"),
            _make_dataset_column("m_col"),
        ]
        result = map_columns([], cols)
        assert result.unmapped_target == ["a_col", "m_col", "z_col"]


# ── Edge cases ───────────────────────────────────────────


class TestEdgeCases:
    def test_empty_source_columns(self) -> None:
        cols = [_make_dataset_column("nom")]
        result = map_columns([], cols)
        assert len(result.mappings) == 0
        assert "nom" in result.unmapped_target

    def test_empty_target_columns(self) -> None:
        result = map_columns(["nom"], [])
        assert len(result.mappings) == 0
        assert "nom" in result.unmapped_source

    def test_both_empty(self) -> None:
        result = map_columns([], [])
        assert len(result.mappings) == 0
        assert len(result.unmapped_source) == 0
        assert len(result.unmapped_target) == 0

    def test_no_duplicate_target_mapping(self) -> None:
        """Two source columns that normalize to the same target
        should not both map to it \u2014 first wins."""
        cols = [_make_dataset_column("nom")]
        result = map_columns(["Nom", "NOM"], cols)
        # Only one should map
        assert len(result.mappings) == 1
        assert len(result.unmapped_source) == 1

    def test_transform_field_default_none(self) -> None:
        cols = [_make_dataset_column("nom")]
        result = map_columns(["nom"], cols)
        assert result.mappings[0].transform is None

    def test_format_hint_none_uses_no_aliases(self) -> None:
        cols = [_make_dataset_column("nom_complet")]
        result = map_columns(["Collaborateur"], cols, format_hint=None)
        # No alias dict used (format_hint is None)
        assert len(result.mappings) == 0

    def test_format_hint_csv_uses_no_aliases(self) -> None:
        cols = [_make_dataset_column("nom_complet")]
        result = map_columns(["Collaborateur"], cols, format_hint="csv")
        assert len(result.mappings) == 0

    def test_format_hint_xlsx_uses_no_aliases(self) -> None:
        """With format_hint='xlsx', alias dicts are NOT loaded, but fuzzy
        normalization still works. Use a source that has NO fuzzy match."""
        cols = [_make_dataset_column("salaire_brut")]
        result = map_columns(["Salary Gross"], cols, format_hint="xlsx")
        assert len(result.mappings) == 0
        assert "Salary Gross" in result.unmapped_source


# ── Sage aliases ──────────────────────────────────────────


class TestSageAliases:
    """Tests for Sage FEC/CSV alias mapping (format_hint='sage')."""

    def test_journalcode_maps_to_journal_code(self) -> None:
        cols = [_make_dataset_column("journal_code")]
        result = map_columns(["JournalCode"], cols, format_hint="sage")
        assert len(result.mappings) == 1
        assert result.mappings[0].target_column == "journal_code"
        assert result.mappings[0].confidence == pytest.approx(0.95)

    def test_comptenum_maps_to_compte_num(self) -> None:
        cols = [_make_dataset_column("compte_num")]
        result = map_columns(["CompteNum"], cols, format_hint="sage")
        assert result.mappings[0].target_column == "compte_num"

    def test_ecrituredate_maps_to_date_ecriture(self) -> None:
        cols = [_make_dataset_column("date_ecriture")]
        result = map_columns(["EcritureDate"], cols, format_hint="sage")
        assert result.mappings[0].target_column == "date_ecriture"

    def test_debit_credit_maps(self) -> None:
        cols = [_make_dataset_column("debit"), _make_dataset_column("credit")]
        result = map_columns(["Debit", "Credit"], cols, format_hint="sage")
        assert len(result.mappings) == 2

    def test_sage_alias_not_applied_without_hint(self) -> None:
        """Without format_hint='sage', Sage aliases should not be used."""
        cols = [_make_dataset_column("journal_code")]
        result = map_columns(["JournalCode"], cols, format_hint="csv")
        # No alias match, no fuzzy match either
        assert len(result.mappings) == 0
        assert "JournalCode" in result.unmapped_source

    def test_montantttc_maps_to_montant_ttc(self) -> None:
        cols = [_make_dataset_column("montant_ttc")]
        result = map_columns(["MontantTTC"], cols, format_hint="sage")
        assert result.mappings[0].target_column == "montant_ttc"

    def test_multiple_sage_mappings(self) -> None:
        cols = [
            _make_dataset_column("journal_code"),
            _make_dataset_column("date_ecriture"),
            _make_dataset_column("debit"),
            _make_dataset_column("credit"),
        ]
        result = map_columns(
            ["JournalCode", "EcritureDate", "Debit", "Credit"],
            cols,
            format_hint="sage",
        )
        assert len(result.mappings) == 4
        assert len(result.unmapped_source) == 0


# ── ColumnMapping dataclass ─────────────────────────────


class TestColumnMapping:
    def test_frozen_dataclass(self) -> None:
        cm = ColumnMapping(
            source_column="src",
            target_column="tgt",
            confidence=0.95,
        )
        assert cm.source_column == "src"
        assert cm.target_column == "tgt"
        assert cm.confidence == 0.95
        assert cm.transform is None
        with pytest.raises(AttributeError):
            cm.confidence = 0.5

    def test_with_transform(self) -> None:
        def fn(x):
            return str(x)

        cm = ColumnMapping(
            source_column="src",
            target_column="tgt",
            confidence=1.0,
            transform=fn,
        )
        assert cm.transform is fn


# ── MappingResult dataclass ─────────────────────────────


class TestMappingResult:
    def test_frozen_dataclass(self) -> None:
        mr = MappingResult(mappings=[])
        assert mr.mappings == []
        assert mr.unmapped_source == []
        assert mr.unmapped_target == []
        assert mr.warnings == []
        with pytest.raises(AttributeError):
            mr.mappings = []

    def test_defaults(self) -> None:
        mr = MappingResult(mappings=[])
        assert mr.unmapped_source == []
        assert mr.unmapped_target == []
        assert mr.warnings == []
