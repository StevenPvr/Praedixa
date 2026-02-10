"""Security gap analysis — Medical masking completeness (GDPR Art. 9).

Tests that ALL sensitive medical fields are masked or removed when absence
data passes through the medical masking service. This includes fields that
may have been added after the initial masking implementation.

Known gap (P1):
- recurrence_pattern is NOT in _SENSITIVE_FIELDS but contains medical metadata
  (e.g., recurring sick leave patterns that could reveal chronic conditions).
  Tests that expose this gap are marked with xfail.

GDPR Article 9: Processing of special categories of personal data
"""

import copy

import pytest

from app.services.medical_masking import (
    _MASKED_REASON,
    _MEDICAL_ABSENCE_TYPES,
    _SENSITIVE_FIELDS,
    is_medical_absence_type,
    mask_medical_reasons,
)

# ── 1. Sensitive field completeness ────────────────────────────


class TestSensitiveFieldCompleteness:
    """Verify all health-related fields are in _SENSITIVE_FIELDS."""

    def test_known_sensitive_fields_present(self) -> None:
        """All currently-known sensitive fields are in the frozenset."""
        assert "medical_certificate_required" in _SENSITIVE_FIELDS
        assert "medical_certificate_uploaded" in _SENSITIVE_FIELDS
        assert "diagnosis_code" in _SENSITIVE_FIELDS
        assert "medical_notes" in _SENSITIVE_FIELDS

    def test_recurrence_pattern_is_sensitive(self) -> None:
        """recurrence_pattern should be masked for medical absences.

        This field contains patterns like 'every Monday' for recurring absences.
        For medical types (sick_leave, maternity), this reveals health patterns
        that constitute special category data under GDPR Article 9.
        """
        assert "recurrence_pattern" in _SENSITIVE_FIELDS

    def test_recurrence_pattern_removed_for_medical_absence(self) -> None:
        """recurrence_pattern is removed from medical absence records."""
        absences = [
            {
                "type": "sick_leave",
                "reason": "Chronic pain",
                "recurrence_pattern": {
                    "type": "weekly",
                    "day_of_week": "monday",
                    "frequency": 1,
                },
            }
        ]
        result = mask_medical_reasons(absences)
        assert "recurrence_pattern" not in result[0]


# ── 2. All medical types masked in masking function ────────────


class TestAllMedicalTypesMasked:
    """Every medical type in _MEDICAL_ABSENCE_TYPES is properly masked."""

    @pytest.mark.parametrize("medical_type", list(_MEDICAL_ABSENCE_TYPES))
    def test_reason_masked(self, medical_type: str) -> None:
        absences = [{"type": medical_type, "reason": "Confidential medical info"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    @pytest.mark.parametrize("medical_type", list(_MEDICAL_ABSENCE_TYPES))
    def test_all_known_sensitive_fields_removed(self, medical_type: str) -> None:
        """Every field in _SENSITIVE_FIELDS is removed for medical absences."""
        absences = [
            {
                "type": medical_type,
                "reason": "Flu",
                "medical_certificate_required": True,
                "medical_certificate_uploaded": True,
                "diagnosis_code": "J06.9",
                "medical_notes": "Doctor note",
                "manager_comment": "Approved",
            }
        ]
        result = mask_medical_reasons(absences)
        for field in _SENSITIVE_FIELDS:
            assert field not in result[0], (
                f"{field} should be removed for {medical_type}"
            )

    @pytest.mark.parametrize("medical_type", list(_MEDICAL_ABSENCE_TYPES))
    def test_original_not_mutated(self, medical_type: str) -> None:
        """Original input is never mutated (defense against aliasing bugs)."""
        original = [
            {
                "type": medical_type,
                "reason": "Heart surgery",
                "medical_certificate_required": True,
            }
        ]
        original_copy = copy.deepcopy(original)
        mask_medical_reasons(original)
        assert original == original_copy


# ── 3. Non-medical types are NOT masked ────────────────────────


class TestNonMedicalTypesNotMasked:
    """Non-medical absence types preserve all fields untouched."""

    NON_MEDICAL = [
        "paid_leave",
        "rtt",
        "bereavement",
        "wedding",
        "moving",
        "unpaid_leave",
        "training",
        "remote_work",
        "other",
        "parental",
    ]

    @pytest.mark.parametrize("non_medical_type", NON_MEDICAL)
    def test_reason_preserved(self, non_medical_type: str) -> None:
        """Reason is unchanged for non-medical types."""
        reason = "Family vacation"
        result = mask_medical_reasons([{"type": non_medical_type, "reason": reason}])
        assert result[0]["reason"] == reason

    @pytest.mark.parametrize("non_medical_type", NON_MEDICAL)
    def test_is_medical_returns_false(self, non_medical_type: str) -> None:
        """is_medical_absence_type returns False for non-medical types."""
        assert is_medical_absence_type(non_medical_type) is False


# ── 4. Edge cases for type resolution ──────────────────────────


class TestTypeResolutionEdgeCases:
    """Masking handles various ways the type field can appear."""

    def test_enum_object_type_masked(self) -> None:
        """Enum objects with .value attribute are resolved correctly."""
        from types import SimpleNamespace

        absences = [{"type": SimpleNamespace(value="sick_leave"), "reason": "Flu"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_absence_type_key_variant(self) -> None:
        """'absence_type' key (instead of 'type') is also checked."""
        absences = [{"absence_type": "maternity", "reason": "Pregnancy leave"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_missing_type_not_masked(self) -> None:
        """Absence without type field defaults to not-masked (safe default)."""
        absences = [{"reason": "Unknown", "employee_id": "emp-001"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == "Unknown"

    def test_none_type_not_masked(self) -> None:
        """Absence with type=None is not masked."""
        absences = [{"type": None, "reason": "Unknown"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == "Unknown"

    def test_numeric_type_not_masked(self) -> None:
        """Absence with numeric type is not masked (handles gracefully)."""
        absences = [{"type": 42, "reason": "Unknown"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == "Unknown"


# ── 5. Medical types frozenset completeness ────────────────────


class TestMedicalTypesFrozensetCompleteness:
    """The _MEDICAL_ABSENCE_TYPES frozenset covers all health-related types."""

    def test_sick_leave_variants_covered(self) -> None:
        """Both sick_leave and sick_leave_workplace are medical."""
        assert "sick_leave" in _MEDICAL_ABSENCE_TYPES
        assert "sick_leave_workplace" in _MEDICAL_ABSENCE_TYPES

    def test_maternity_paternity_covered(self) -> None:
        """Both maternity and paternity are medical."""
        assert "maternity" in _MEDICAL_ABSENCE_TYPES
        assert "paternity" in _MEDICAL_ABSENCE_TYPES

    def test_parental_is_not_medical(self) -> None:
        """Parental leave (non-specific) is NOT medical.

        Parental leave does not inherently involve health data — it is
        family leave, not medical leave. Including it would over-mask
        legitimate administrative data.
        """
        assert "parental" not in _MEDICAL_ABSENCE_TYPES

    def test_exactly_four_medical_types(self) -> None:
        """There are exactly 4 medical absence types."""
        assert len(_MEDICAL_ABSENCE_TYPES) == 4

    def test_frozenset_is_immutable(self) -> None:
        """The medical types set cannot be modified at runtime."""
        assert isinstance(_MEDICAL_ABSENCE_TYPES, frozenset)
