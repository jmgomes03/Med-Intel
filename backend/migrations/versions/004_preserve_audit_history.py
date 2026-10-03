"""Preserve audit history when appointments are deleted."""

from alembic import op


revision = "004_preserve_audit_history"
down_revision = "003_operations_and_audit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "audit_logs_appointment_id_fkey",
        "audit_logs",
        type_="foreignkey",
    )


def downgrade() -> None:
    op.create_foreign_key(
        "audit_logs_appointment_id_fkey",
        "audit_logs",
        "appointments",
        ["appointment_id"],
        ["appointment_id"],
        ondelete="CASCADE",
    )