"""Immutability trigger for fit_parameters.

Revision ID: 005
Revises: 004
Create Date: 2026-02-06

fit_parameters rows are INSERT-only. This trigger prevents UPDATE and
DELETE to enforce parameter versioning integrity. New versions are
always INSERTed with an incremented version number.
"""

from collections.abc import Sequence

from alembic import op  # pyright: ignore[reportAttributeAccessIssue]

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Trigger function that blocks UPDATE and DELETE on fit_parameters.
    # Only the is_active flag can be updated (to deactivate old versions).
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_fit_parameters_mutation()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION
                    'fit_parameters: DELETE forbidden';
            END IF;
            IF TG_OP = 'UPDATE' THEN
                -- Allow updating only is_active (for version deactivation)
                IF NEW.dataset_id    IS DISTINCT FROM OLD.dataset_id
                OR NEW.column_name   IS DISTINCT FROM OLD.column_name
                OR NEW.transform_type IS DISTINCT FROM OLD.transform_type
                OR NEW.parameters    IS DISTINCT FROM OLD.parameters
                OR NEW.hmac_sha256   IS DISTINCT FROM OLD.hmac_sha256
                OR NEW.fitted_at     IS DISTINCT FROM OLD.fitted_at
                OR NEW.row_count     IS DISTINCT FROM OLD.row_count
                OR NEW.version       IS DISTINCT FROM OLD.version
                OR NEW.created_at    IS DISTINCT FROM OLD.created_at
                THEN
                    RAISE EXCEPTION
                        'fit_parameters: only is_active may be updated';
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$;
    """)

    op.execute("""
        CREATE TRIGGER trg_fit_parameters_immutable
        BEFORE UPDATE OR DELETE ON fit_parameters
        FOR EACH ROW
        EXECUTE FUNCTION prevent_fit_parameters_mutation();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_fit_parameters_immutable ON fit_parameters")
    op.execute("DROP FUNCTION IF EXISTS prevent_fit_parameters_mutation()")
