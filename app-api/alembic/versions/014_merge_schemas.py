"""Merge raw and transformed schemas into single data schema.

Simplifies the dual-schema architecture ({org}_raw + {org}_transformed)
into a single {org}_data schema. Raw and transformed tables now coexist
in the same schema, differentiated by table name suffix (_transformed).

Revision ID: 014
Revises: 013
Create Date: 2026-02-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

# revision identifiers, used by Alembic.
revision: str = "014"
down_revision: str | None = "013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add schema_data column (nullable initially for migration)
    op.add_column("client_datasets", sa.Column("schema_data", sa.String(255)))

    # 2. Populate schema_data from schema_raw by replacing suffix
    #    e.g. "acme_raw" -> "acme_data"
    op.execute(
        "UPDATE client_datasets "
        "SET schema_data = REGEXP_REPLACE(schema_raw, '_raw$', '_data')"
    )

    # 3. Make NOT NULL
    op.alter_column("client_datasets", "schema_data", nullable=False)

    # 4. Drop old columns
    op.drop_column("client_datasets", "schema_raw")
    op.drop_column("client_datasets", "schema_transformed")


def downgrade() -> None:
    # Re-create old columns
    op.add_column("client_datasets", sa.Column("schema_raw", sa.String(255)))
    op.add_column("client_datasets", sa.Column("schema_transformed", sa.String(255)))

    # Populate from schema_data
    op.execute(
        "UPDATE client_datasets "
        "SET schema_raw = REGEXP_REPLACE(schema_data, '_data$', '_raw'), "
        "    schema_transformed = REGEXP_REPLACE(schema_data, '_data$', '_transformed')"
    )

    # Make NOT NULL
    op.alter_column("client_datasets", "schema_raw", nullable=False)
    op.alter_column("client_datasets", "schema_transformed", nullable=False)

    # Drop schema_data
    op.drop_column("client_datasets", "schema_data")
