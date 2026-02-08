"""Medical reason masking — GDPR Article 9 compliance.

Masks sensitive medical information in absence records when viewed
by admin users. Medical reasons are special category data under GDPR
and must be protected even from super_admin access.

Security notes:
- Health data (Article 9 GDPR) requires explicit consent or legal basis
  for processing. The admin back-office has neither — admins see aggregated
  capacity data, not individual medical details.
- The masking is applied at the service layer (not presentation) to ensure
  no code path can accidentally expose medical reasons.
- Returns new lists/dicts — never mutates input data.
"""

from typing import Any

# Absence types that are considered medical (GDPR Article 9 — health data)
_MEDICAL_ABSENCE_TYPES: frozenset[str] = frozenset(
    {
        "sick_leave",
        "sick_leave_workplace",
        "maternity",
        "paternity",
    }
)

_MASKED_REASON = "[MEDICAL]"

# Fields to remove from medical absences (contain health-related metadata)
_SENSITIVE_FIELDS: frozenset[str] = frozenset(
    {
        "medical_certificate_required",
        "medical_certificate_uploaded",
        "diagnosis_code",
        "medical_notes",
    }
)


def mask_medical_reasons(absences: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Mask medical reasons in absence records for admin views.

    Replaces `reason` with "[MEDICAL]" when the absence type is medical.
    Also removes sensitive medical fields if present.

    Returns a NEW list (does not mutate the input).
    """
    result = []
    for absence in absences:
        masked = dict(absence)  # shallow copy
        absence_type = masked.get("type") or masked.get("absence_type", "")

        # Resolve enum values to strings
        type_str = ""
        if isinstance(absence_type, str):
            type_str = absence_type.lower()
        elif hasattr(absence_type, "value"):
            type_str = str(absence_type.value).lower()

        if type_str in _MEDICAL_ABSENCE_TYPES:
            masked["reason"] = _MASKED_REASON
            for field in _SENSITIVE_FIELDS:
                masked.pop(field, None)

        result.append(masked)
    return result


def is_medical_absence_type(absence_type: str) -> bool:
    """Check if an absence type is considered medical."""
    return absence_type.lower() in _MEDICAL_ABSENCE_TYPES
