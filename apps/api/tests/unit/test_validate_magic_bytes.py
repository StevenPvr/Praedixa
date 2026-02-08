"""Tests for _validate_magic_bytes in datasets router.

Covers the latin-1 fallback path for CSV files with non-UTF-8 bytes.
"""

import pytest

from app.core.exceptions import PraedixaError
from app.routers.datasets import _validate_magic_bytes


class TestValidateMagicBytes:
    def test_csv_utf8_passes(self):
        """Valid UTF-8 CSV passes without error."""
        _validate_magic_bytes(b"nom;age\nDupont;42\n", "data.csv")

    def test_csv_latin1_passes(self):
        """Non-UTF-8 bytes that decode as latin-1 pass (common for French files)."""
        # \xe9 is 'e-acute' in latin-1, invalid as standalone UTF-8
        content = "nom;prénom\nDupont;Hélène\n".encode("latin-1")
        _validate_magic_bytes(content, "data.csv")

    def test_tsv_latin1_passes(self):
        """TSV with latin-1 encoding also passes."""
        content = "nom\tprénom\nDupont\tHélène\n".encode("latin-1")
        _validate_magic_bytes(content, "export.tsv")

    def test_xlsx_valid_magic(self):
        """XLSX with PK signature passes."""
        _validate_magic_bytes(b"PK\x03\x04" + b"\x00" * 100, "data.xlsx")

    def test_xlsx_invalid_magic(self):
        """XLSX without PK signature is rejected."""
        with pytest.raises(PraedixaError, match="Invalid XLSX"):
            _validate_magic_bytes(b"\x00\x00\x00\x00", "data.xlsx")

    def test_unsupported_extension(self):
        """Non-CSV/XLSX extension is rejected."""
        with pytest.raises(PraedixaError, match="Unsupported file type"):
            _validate_magic_bytes(b"data", "report.pdf")
