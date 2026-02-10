"""Proof pack PDF service — generates professional PDF proof-of-value documents.

Creates a multi-page PDF document summarizing the ROI of the Praedixa platform
for a given site and month. Uses reportlab for PDF generation.

Sections:
1. Executive Summary — gains nets, service, adoption
2. Method — BAU vs 100% vs Reel explanation
3. Cost Results — comparison table + gain breakdown
4. Service Results — service improvement metrics
5. Adoption — alert handling statistics
6. Top Decisions — up to 10 decision summaries
7. Action Plan — placeholder for next steps

Security:
- No database access — this is a pure rendering function.
- All data is pre-validated by the caller (router/service layer).
- PDF bytes are returned in-memory, never written to disk.
"""

from io import BytesIO
from typing import Any

from reportlab.lib import colors  # type: ignore[import-untyped]
from reportlab.lib.pagesizes import A4  # type: ignore[import-untyped]
from reportlab.lib.styles import (  # type: ignore[import-untyped]
    ParagraphStyle,
    getSampleStyleSheet,
)
from reportlab.lib.units import cm, mm  # type: ignore[import-untyped]
from reportlab.platypus import (  # type: ignore[import-untyped]
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Praedixa brand colors ──────────────────────────────

_AMBER = colors.HexColor("#F59E0B")
_AMBER_DARK = colors.HexColor("#D97706")
_DARK = colors.HexColor("#1E293B")
_GRAY = colors.HexColor("#64748B")
_LIGHT_BG = colors.HexColor("#FEF3C7")
_WHITE = colors.white


def _build_styles() -> dict[str, ParagraphStyle]:
    """Build custom paragraph styles for the proof pack."""
    base = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "ProofTitle",
            parent=base["Title"],
            fontSize=22,
            textColor=_DARK,
            spaceAfter=6 * mm,
        ),
        "subtitle": ParagraphStyle(
            "ProofSubtitle",
            parent=base["Normal"],
            fontSize=12,
            textColor=_GRAY,
            spaceAfter=10 * mm,
        ),
        "heading": ParagraphStyle(
            "ProofHeading",
            parent=base["Heading2"],
            fontSize=14,
            textColor=_AMBER_DARK,
            spaceBefore=8 * mm,
            spaceAfter=4 * mm,
        ),
        "body": ParagraphStyle(
            "ProofBody",
            parent=base["Normal"],
            fontSize=10,
            textColor=_DARK,
            spaceAfter=3 * mm,
            leading=14,
        ),
        "bold": ParagraphStyle(
            "ProofBold",
            parent=base["Normal"],
            fontSize=10,
            textColor=_DARK,
            spaceAfter=2 * mm,
            leading=14,
        ),
        "small": ParagraphStyle(
            "ProofSmall",
            parent=base["Normal"],
            fontSize=8,
            textColor=_GRAY,
        ),
    }


def _fmt_eur(value: float | str | None) -> str:
    """Format a value as EUR currency."""
    if value is None:
        return "N/A"
    v = float(value)
    return f"{v:,.2f} \u20ac"


def _fmt_pct(value: float | str | None) -> str:
    """Format a value as percentage."""
    if value is None:
        return "N/A"
    v = float(value)
    if v <= 1:
        v *= 100
    return f"{v:.1f}%"


def _build_cost_section(
    proof_record: dict[str, Any],
    gain: float | str,
    styles: dict[str, ParagraphStyle],
) -> list[Any]:
    """Build the cost results section elements."""
    elements: list[Any] = []
    elements.append(Paragraph("R\u00e9sultats Co\u00fbts", styles["heading"]))

    cout_bau = proof_record.get("cout_bau_eur", 0)
    cout_100 = proof_record.get("cout_100_eur", 0)
    cout_reel = proof_record.get("cout_reel_eur", 0)

    cost_data = [
        ["Sc\u00e9nario", "Co\u00fbt total", "vs BAU"],
        ["BAU (0%)", _fmt_eur(cout_bau), "\u2014"],
        [
            "Optimis\u00e9 (100%)",
            _fmt_eur(cout_100),
            _fmt_eur(float(cout_bau) - float(cout_100)),
        ],
        [
            "R\u00e9el",
            _fmt_eur(cout_reel),
            _fmt_eur(float(cout_bau) - float(cout_reel)),
        ],
    ]
    cost_table = Table(cost_data, colWidths=[6 * cm, 5 * cm, 5 * cm])
    cost_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), _WHITE),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, _GRAY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_WHITE, _LIGHT_BG]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(cost_table)
    elements.append(Spacer(1, 6 * mm))
    elements.append(
        Paragraph(
            f"<b>Gain net r\u00e9alis\u00e9 : {_fmt_eur(gain)}</b>",
            styles["body"],
        )
    )
    return elements


def _build_decisions_section(
    decisions: list[dict[str, Any]],
    styles: dict[str, ParagraphStyle],
) -> list[Any]:
    """Build the top decisions section elements."""
    elements: list[Any] = []
    elements.append(Paragraph("Top D\u00e9cisions", styles["heading"]))

    top_decisions = decisions[:10]
    if top_decisions:
        dec_header = ["Date", "Shift", "Gap (h)", "Co\u00fbt obs.", "Override"]
        dec_rows = [dec_header]
        dec_rows.extend(
            [
                str(dec.get("decision_date", "")),
                str(dec.get("shift", "")),
                str(dec.get("gap_h", "")),
                _fmt_eur(dec.get("cout_observe_eur")),
                "Oui" if dec.get("is_override") else "Non",
            ]
            for dec in top_decisions
        )

        dec_table = Table(
            dec_rows, colWidths=[3 * cm, 2.5 * cm, 3 * cm, 4 * cm, 3.5 * cm]
        )
        dec_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), _AMBER),
                    ("TEXTCOLOR", (0, 0), (-1, 0), _WHITE),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                    ("GRID", (0, 0), (-1, -1), 0.5, _GRAY),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_WHITE, _LIGHT_BG]),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        elements.append(dec_table)
    else:
        elements.append(
            Paragraph(
                "Aucune d\u00e9cision enregistr\u00e9e pour cette p\u00e9riode.",
                styles["body"],
            )
        )
    return elements


def generate_proof_pack_pdf(
    *,
    org_name: str,
    site_id: str,
    month: str,
    proof_record: dict[str, Any],
    decisions: list[dict[str, Any]],
) -> bytes:
    """Generate a PDF proof pack.

    No database access — pure rendering function.
    All data must be pre-validated by the caller.

    Returns PDF bytes suitable for HTTP response or file storage.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )

    styles = _build_styles()
    elements: list[Any] = []

    # ── 1. Executive Summary ────────────────────────────
    elements.append(Paragraph("Proof Pack Praedixa", styles["title"]))
    elements.append(
        Paragraph(
            f"{org_name} \u2014 Site {site_id} \u2014 {month}", styles["subtitle"]
        )
    )

    gain = proof_record.get("gain_net_eur", 0)
    adoption = proof_record.get("adoption_pct")
    service_reel = proof_record.get("service_reel_pct")

    summary_data = [
        ["M\u00e9trique", "Valeur"],
        ["Gains nets", _fmt_eur(gain)],
        ["Adoption", _fmt_pct(adoption)],
        ["Service r\u00e9el", _fmt_pct(service_reel)],
        ["Alertes \u00e9mises", str(proof_record.get("alertes_emises", 0))],
        ["Alertes trait\u00e9es", str(proof_record.get("alertes_traitees", 0))],
    ]
    summary_table = Table(summary_data, colWidths=[8 * cm, 8 * cm])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _AMBER),
                ("TEXTCOLOR", (0, 0), (-1, 0), _WHITE),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, _GRAY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_WHITE, _LIGHT_BG]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(summary_table)
    elements.append(Spacer(1, 10 * mm))

    # ── 2. Method ───────────────────────────────────────
    elements.append(Paragraph("M\u00e9thodologie", styles["heading"]))
    elements.append(
        Paragraph(
            "<b>BAU (0%)</b> : Co\u00fbt estim\u00e9 "
            "si l\u2019entreprise avait appliqu\u00e9 "
            "son mix historique moyen (heures suppl., int\u00e9rim, etc.) sans "
            "optimisation algorithmique.",
            styles["body"],
        )
    )
    elements.append(
        Paragraph(
            "<b>100%</b> : Co\u00fbt th\u00e9orique si toutes les recommandations "
            "Praedixa avaient \u00e9t\u00e9 suivies syst\u00e9matiquement.",
            styles["body"],
        )
    )
    elements.append(
        Paragraph(
            "<b>R\u00e9el</b> : Co\u00fbt observ\u00e9 en pratique, incluant les "
            "d\u00e9cisions manuelles et les overrides.",
            styles["body"],
        )
    )

    # ── 3. Cost Results ─────────────────────────────────
    elements.extend(_build_cost_section(proof_record, gain, styles))

    # ── 4. Service Results ──────────────────────────────
    elements.append(Paragraph("R\u00e9sultats Service", styles["heading"]))

    service_bau = proof_record.get("service_bau_pct")
    service_data = [
        ["M\u00e9trique", "BAU", "R\u00e9el"],
        ["Niveau de service", _fmt_pct(service_bau), _fmt_pct(service_reel)],
    ]
    service_table = Table(service_data, colWidths=[6 * cm, 5 * cm, 5 * cm])
    service_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), _WHITE),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, _GRAY),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(service_table)

    # ── 5. Adoption ─────────────────────────────────────
    elements.append(Paragraph("Adoption", styles["heading"]))

    emises = proof_record.get("alertes_emises", 0)
    traitees = proof_record.get("alertes_traitees", 0)
    elements.append(
        Paragraph(
            f"Alertes \u00e9mises : <b>{emises}</b> | "
            f"Alertes trait\u00e9es : <b>{traitees}</b> | "
            f"Taux d\u2019adoption : <b>{_fmt_pct(adoption)}</b>",
            styles["body"],
        )
    )

    # ── 6. Top Decisions ────────────────────────────────
    elements.extend(_build_decisions_section(decisions, styles))

    # ── 7. Action Plan ──────────────────────────────────
    elements.append(Paragraph("Plan d\u2019Action", styles["heading"]))
    elements.append(
        Paragraph(
            "Ce plan d\u2019action sera compl\u00e9t\u00e9 lors de la revue mensuelle "
            "avec l\u2019\u00e9quipe op\u00e9rationnelle.",
            styles["body"],
        )
    )
    elements.append(
        Paragraph(
            "\u2022 Analyser les overrides fr\u00e9quents "
            "pour affiner le mod\u00e8le<br/>"
            "\u2022 Identifier les sites \u00e0 faible adoption<br/>"
            "\u2022 Ajuster les param\u00e8tres de co\u00fbt si n\u00e9cessaire<br/>"
            "\u2022 Planifier la formation des managers",
            styles["body"],
        )
    )

    # Footer
    elements.append(Spacer(1, 15 * mm))
    elements.append(
        Paragraph(
            f"G\u00e9n\u00e9r\u00e9 par Praedixa \u2014 {org_name} \u2014 {month}",
            styles["small"],
        )
    )

    doc.build(elements)
    return buffer.getvalue()
