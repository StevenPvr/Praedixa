"""Tests for app.services.medical_masking — GDPR Article 9 compliance."""

import pytest

from app.services.medical_masking import (
    _MASKED_REASON,
    _MEDICAL_ABSENCE_TYPES,
    is_medical_absence_type,
    mask_medical_reasons,
)


class TestIsMedicalAbsenceType:
    """Tests for is_medical_absence_type()."""

    @pytest.mark.parametrize(
        "absence_type",
        [
            "sick_leave",
            "sick_leave_workplace",
            "maternity",
            "paternity",
        ],
    )
    def test_medical_types_are_recognized(self, absence_type) -> None:
        assert is_medical_absence_type(absence_type) is True

    @pytest.mark.parametrize(
        "absence_type",
        [
            "vacation",
            "personal",
            "training",
            "bereavement",
            "unpaid_leave",
        ],
    )
    def test_non_medical_types_are_not_recognized(self, absence_type) -> None:
        assert is_medical_absence_type(absence_type) is False

    def test_case_insensitive(self) -> None:
        assert is_medical_absence_type("SICK_LEAVE") is True
        assert is_medical_absence_type("Maternity") is True


class TestMaskMedicalReasons:
    """Tests for mask_medical_reasons()."""

    def test_medical_absence_reason_is_masked(self) -> None:
        absences = [{"type": "sick_leave", "reason": "flu symptoms"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_non_medical_absence_is_untouched(self) -> None:
        absences = [{"type": "vacation", "reason": "summer holiday"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == "summer holiday"

    def test_empty_list_returns_empty(self) -> None:
        assert mask_medical_reasons([]) == []

    def test_mixed_list(self) -> None:
        absences = [
            {"type": "sick_leave", "reason": "confidential"},
            {"type": "vacation", "reason": "travel"},
            {"type": "maternity", "reason": "pregnancy leave"},
        ]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON
        assert result[1]["reason"] == "travel"
        assert result[2]["reason"] == _MASKED_REASON

    def test_certificate_fields_removed_from_medical(self) -> None:
        absences = [
            {
                "type": "sick_leave",
                "reason": "flu",
                "medical_certificate_required": True,
                "medical_certificate_uploaded": False,
            }
        ]
        result = mask_medical_reasons(absences)
        assert "medical_certificate_required" not in result[0]
        assert "medical_certificate_uploaded" not in result[0]

    def test_certificate_fields_preserved_on_non_medical(self) -> None:
        absences = [
            {
                "type": "vacation",
                "reason": "holiday",
                "medical_certificate_required": False,
            }
        ]
        result = mask_medical_reasons(absences)
        assert result[0]["medical_certificate_required"] is False

    def test_does_not_mutate_input(self) -> None:
        original = [{"type": "sick_leave", "reason": "flu"}]
        mask_medical_reasons(original)
        assert original[0]["reason"] == "flu"

    def test_absence_type_key_variant(self) -> None:
        """Test with 'absence_type' key instead of 'type'."""
        absences = [{"absence_type": "maternity", "reason": "leave"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_enum_like_type_with_value_attribute(self) -> None:
        """Test with objects that have a .value attribute (like enums)."""
        from types import SimpleNamespace

        enum_like = SimpleNamespace(value="sick_leave")
        absences = [{"type": enum_like, "reason": "illness"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == _MASKED_REASON

    def test_diagnosis_code_removed(self) -> None:
        absences = [
            {
                "type": "sick_leave",
                "reason": "flu",
                "diagnosis_code": "J11.1",
            }
        ]
        result = mask_medical_reasons(absences)
        assert "diagnosis_code" not in result[0]

    def test_medical_notes_removed(self) -> None:
        absences = [
            {
                "type": "paternity",
                "reason": "birth",
                "medical_notes": "all good",
            }
        ]
        result = mask_medical_reasons(absences)
        assert "medical_notes" not in result[0]

    def test_all_medical_types_covered(self) -> None:
        for med_type in _MEDICAL_ABSENCE_TYPES:
            absences = [{"type": med_type, "reason": "secret"}]
            result = mask_medical_reasons(absences)
            assert result[0]["reason"] == _MASKED_REASON, f"Failed for {med_type}"

    def test_missing_type_key_does_not_crash(self) -> None:
        absences = [{"reason": "something"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == "something"

    def test_none_type_does_not_crash(self) -> None:
        absences = [{"type": None, "reason": "something"}]
        result = mask_medical_reasons(absences)
        assert result[0]["reason"] == "something"
