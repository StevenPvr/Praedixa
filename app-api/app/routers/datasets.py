"""Datasets router -- backward-compatible re-export shim.

This module re-exports everything from the split routers so that
existing imports (``from app.routers.datasets import ...``) and
mock patches (``@patch("app.routers.datasets.XXX")``) continue
to work without modification.

The actual implementation now lives in:
- datasets_crud.py       -- GET/POST/PATCH/DELETE endpoints
- datasets_ingestion.py  -- File upload + helpers
"""

# Re-export the CRUD router (used by main.py as datasets.router)
# Re-export settings so @patch("app.routers.datasets.settings") works
from app.core.config import settings  # noqa: F401
from app.routers.datasets_crud import router  # noqa: F401

# Re-export ingestion helpers and imports so that test patches
# like @patch("app.routers.datasets._validate_magic_bytes") keep working.
from app.routers.datasets_ingestion import (  # noqa: F401
    _check_cooldown,
    _log_ingestion_failure,
    _read_upload_content,
    _sanitize_sheet_name,
    _validate_magic_bytes,
)

# Re-export ingestion router for main.py mounting
from app.routers.datasets_ingestion import router as ingestion_router  # noqa: F401

# Ingestion router services:
from app.services.column_mapper import map_columns  # noqa: F401
from app.services.data_quality import QualityConfig, run_quality_checks  # noqa: F401

# Re-export service functions that are imported and patched via this module.
# CRUD router services:
from app.services.datasets import (  # noqa: F401
    create_dataset,
    get_config_history,
    get_dataset,
    get_dataset_columns,
    get_dataset_data,
    get_fit_parameters,
    get_ingestion_log,
    get_quality_reports,
    list_datasets,
    update_dataset_config,
)
from app.services.file_parser import parse_file  # noqa: F401
from app.services.raw_inserter import insert_raw_rows  # noqa: F401
