"""Security tests: medical reason masking (GDPR Article 9).

Tests that medical reasons are properly masked when absence data is
viewed through admin endpoints. Medical data is special category data
under GDPR and must NEVER be visible to admin users.

Threat model:
- Information disclosure: admin sees specific medical diagnoses.
- Data leak via unmasked fields: medical_certificate_required, etc.
- Bypass via enum value: using .name vs .value for absence type.
- Partial masking: some medical types masked but not all.
- Mutation safety: masking must not modify original data.

Strategy:
- Unit test mask_medical_reasons() exhaustively.
- Test with all medical types (sick_leave, sick_leave_workplace, maternity, paternity).
- Test non-medical types pass through unchanged.
- Test mixed lists (medical + non-medical).
- Test edge cases: empty list, missing fields, enum objects vs strings.
- Verify original data is never mutated.
- Integration tests via admin endpoint to verify masking applies in HTTP responses.
"""

import copy
from types import SimpleNamespace

import pytest

from app.services.medical_masking import (
    _MASKED_REASON,
    _MEDICAL_ABSENCE_TYPES,
    _SENSITIVE_FIELDS,
    is_medical_absence_type,
    mask_medical_reasons,
)

# ── 1. Medical types are masked ──────────────────────────────────────


class TestMedicalTypeMasking:
    """All medical absence types must have their reasons masked."""

    @pytest.mark.parametrize(
        "medical_type",
        list(_MEDICAL_ABSENCE_TYPES),
        ids=list(_MEDICAL_ABSENCE_TYPES),
    )
    def test_medical_type_reason_is_masked(self, medical_type: str) -> None:
        """Reason for medical absence type '{medical_type}' is masked."""
        absences = [
            {
                "type": medical_type,
                "reason": "Patient has severe chronic pain",
                "employee_id": "emp-001",
            }
        ]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    @pytest.mark.parametrize(
        "medical_type",
        list(_MEDICAL_ABSENCE_TYPES),
    )
    def test_medical_type_sensitive_fields_removed(self, medical_type: str) -> None:
        """Sensitive medical fields are removed for medical absence types."""
        absences = [
            {
                "type": medical_type,
                "reason": "Flu",
                "medical_certificate_required": True,
                "medical_certificate_uploaded": True,
                "diagnosis_code": "J06.9",
                "medical_notes": "Doctor note attached",
                "employee_id": "emp-001",
            }
        ]
        result = mask_medical_reasons(absences)

        for field in _SENSITIVE_FIELDS:
            assert field not in result[0], (
                f"Sensitive field '{field}' should be removed for type {medical_type}"
            )

    def test_medical_type_preserves_non_sensitive_fields(self) -> None:
        """Non-sensitive fields are preserved even for medical absences."""
        absences = [
            {
                "type": "sick_leave",
                "reason": "Flu",
                "employee_id": "emp-001",
                "start_date": "2026-01-15",
                "end_date": "2026-01-20",
                "status": "approved",
            }
        ]
        result = mask_medical_reasons(absences)
        assert result[0]["employee_id"] == "emp-001"
        assert result[0]["start_date"] == "2026-01-15"
        assert result[0]["end_date"] == "2026-01-20"
        assert result[0]["status"] == "approved"
        assert result[0]["type"] == "sick_leave"


# ── 2. Non-medical types pass through ────────────────────────────────


class TestNonMedicalPassthrough:
    """Non-medical absence types must NOT be masked."""

    @pytest.mark.parametrize(
        "non_medical_type",
        [
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
        ],
    )
    def test_non_medical_reason_unchanged(self, non_medical_type: str) -> None:
        """Reason for non-medical type is passed through unmodified."""
        original_reason = "Family vacation in Spain"
        absences = [
            {
                "type": non_medical_type,
                "reason": original_reason,
                "employee_id": "emp-001",
            }
        ]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == original_reason

    @pytest.mark.parametrize(
        "non_medical_type",
        ["paid_leave", "remote_work", "training"],
    )
    def test_non_medical_sensitive_fields_preserved(
        self, non_medical_type: str
    ) -> None:
        """Sensitive field names are NOT removed for non-medical types.

        These fields might coincidentally be present in non-medical records
        (e.g., from a previous data migration). They should remain untouched.
        """
        absences = [
            {
                "type": non_medical_type,
                "reason": "Standard leave",
                "medical_certificate_required": False,
                "medical_certificate_uploaded": False,
            }
        ]
        result = mask_medical_reasons(absences)
        assert "medical_certificate_required" in result[0]
        assert "medical_certificate_uploaded" in result[0]


# ── 3. Mixed lists ──────────────────────────────────────────────────


class TestMixedLists:
    """Mixed medical and non-medical absences are handled correctly."""

    def test_mixed_list_only_medical_masked(self) -> None:
        """In a mixed list, only medical absences are masked."""
        absences = [
            {"type": "sick_leave", "reason": "Migraine", "employee_id": "emp-001"},
            {"type": "paid_leave", "reason": "Holiday", "employee_id": "emp-002"},
            {"type": "maternity", "reason": "Pregnancy", "employee_id": "emp-003"},
            {"type": "training", "reason": "Python course", "employee_id": "emp-004"},
        ]
        result = mask_medical_reasons(absences)

        assert result[0]["reason"] == _MASKED_REASON  # sick_leave
        assert result[1]["reason"] == "Holiday"  # paid_leave — unchanged
        assert result[2]["reason"] == _MASKED_REASON  # maternity
        assert result[3]["reason"] == "Python course"  # training — unchanged

    def test_mixed_list_correct_count(self) -> None:
        """Masking does not change the number of items."""
        absences = [
            {"type": "sick_leave", "reason": "X"},
            {"type": "paid_leave", "reason": "Y"},
        ]
        result = mask_medical_reasons(absences)
        assert len(result) == 2


# ── 4. Edge cases ────────────────────────────────────────────────────


class TestEdgeCases:
    """Edge cases for the masking function."""

    def test_empty_list(self) -> None:
        """Empty input returns empty output."""
        assert mask_medical_reasons([]) == []

    def test_missing_reason_field(self) -> None:
        """Medical absence without reason field still adds masked reason."""
        absences = [{"type": "sick_leave", "employee_id": "emp-001"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_none_reason_is_masked(self) -> None:
        """Medical absence with reason=None gets masked."""
        absences = [{"type": "sick_leave", "reason": None}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_empty_string_reason_is_masked(self) -> None:
        """Medical absence with reason='' gets masked."""
        absences = [{"type": "sick_leave", "reason": ""}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_missing_type_field(self) -> None:
        """Absence without type field is not masked (safe default)."""
        absences = [{"reason": "Unknown", "employee_id": "emp-001"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == "Unknown"

    def test_absence_type_key_variant(self) -> None:
        """Supports 'absence_type' key as well as 'type'."""
        absences = [{"absence_type": "sick_leave", "reason": "Flu"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_enum_object_as_type(self) -> None:
        """Supports enum objects with .value attribute."""
        absences = [
            {
                "type": SimpleNamespace(value="sick_leave"),
                "reason": "Doctor visit",
            }
        ]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_enum_object_non_medical(self) -> None:
        """Non-medical enum objects are not masked."""
        absences = [
            {
                "type": SimpleNamespace(value="paid_leave"),
                "reason": "Holiday",
            }
        ]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == "Holiday"

    def test_case_insensitive_type(self) -> None:
        """Type matching is case-insensitive."""
        absences = [{"type": "SICK_LEAVE", "reason": "Flu"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_mixed_case_type(self) -> None:
        """Mixed case types are handled."""
        absences = [{"type": "Sick_Leave", "reason": "Flu"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_sensitive_field_not_present_no_error(self) -> None:
        """If sensitive fields don't exist, no error is raised."""
        absences = [{"type": "sick_leave", "reason": "Flu"}]
        # No sensitive fields present — should work fine
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON


# ── 5. Immutability ─────────────────────────────────────────────────


class TestImmutability:
    """mask_medical_reasons must NOT mutate the original input."""

    def test_original_data_unchanged(self) -> None:
        """The original list is not modified by masking."""
        original = [
            {
                "type": "sick_leave",
                "reason": "Heart condition",
                "medical_certificate_required": True,
                "medical_certificate_uploaded": True,
            }
        ]
        original_copy = copy.deepcopy(original)

        result = mask_medical_reasons(original)

        # Verify the result is masked
        assert result[0]["reason"] == _MASKED_REASON
        assert "medical_certificate_required" not in result[0]

        # Verify the ORIGINAL is unchanged
        assert original == original_copy
        assert original[0]["reason"] == "Heart condition"
        assert original[0]["medical_certificate_required"] is True

    def test_returns_new_list(self) -> None:
        """The returned list is a new object, not the original."""
        original = [{"type": "paid_leave", "reason": "Holiday"}]
        result = mask_medical_reasons(original)
        assert result is not original

    def test_returns_new_dicts(self) -> None:
        """Each returned dict is a new object."""
        original = [{"type": "sick_leave", "reason": "Flu"}]
        result = mask_medical_reasons(original)
        assert result[0] is not original[0]


# ── 6. is_medical_absence_type helper ────────────────────────────────


class TestIsMedicalAbsenceType:
    """Test the is_medical_absence_type helper."""

    @pytest.mark.parametrize(
        "medical_type",
        list(_MEDICAL_ABSENCE_TYPES),
    )
    def test_returns_true_for_medical(self, medical_type: str) -> None:
        assert is_medical_absence_type(medical_type) is True

    @pytest.mark.parametrize(
        "non_medical_type",
        ["paid_leave", "rtt", "remote_work", "training", "other"],
    )
    def test_returns_false_for_non_medical(self, non_medical_type: str) -> None:
        assert is_medical_absence_type(non_medical_type) is False

    def test_case_insensitive(self) -> None:
        assert is_medical_absence_type("SICK_LEAVE") is True
        assert is_medical_absence_type("Maternity") is True

    def test_unknown_type(self) -> None:
        assert is_medical_absence_type("unknown_type") is False


# ── 7. Completeness check ───────────────────────────────────────────


class TestMedicalTypeCompleteness:
    """Verify all known medical absence types are covered."""

    def test_all_medical_types_in_frozenset(self) -> None:
        """The frozenset covers all expected medical types."""
        expected = {"sick_leave", "sick_leave_workplace", "maternity", "paternity"}
        assert expected == _MEDICAL_ABSENCE_TYPES

    def test_masked_reason_is_not_empty(self) -> None:
        """The masking placeholder is a non-empty string."""
        assert isinstance(_MASKED_REASON, str)
        assert len(_MASKED_REASON) > 0
        assert _MASKED_REASON == "[MEDICAL]"

    def test_sensitive_fields_include_certificate_fields(self) -> None:
        """Sensitive fields include medical certificate tracking."""
        assert "medical_certificate_required" in _SENSITIVE_FIELDS
        assert "medical_certificate_uploaded" in _SENSITIVE_FIELDS
