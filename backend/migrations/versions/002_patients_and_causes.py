"""Add patients and appointment causes."""

from alembic import op
import sqlalchemy as sa


revision = "002_patients_and_causes"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "patient_id",
            sa.String(length=50),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "first_name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "last_name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "date_of_birth",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
    )

    op.add_column(
        "appointments",
        sa.Column(
            "patient_id",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "appointments",
        sa.Column(
            "cause",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "appointments_patient_id_fkey",
        "appointments",
        "patients",
        ["patient_id"],
        ["patient_id"],
    )

    op.create_check_constraint(
        "valid_cause",
        "appointments",
        """
        cause IS NULL OR cause IN (
            'check_up',
            'sick',
            'emergency',
            'follow_up',
            'consultation',
            'screening',
            'procedure',
            'other'
        )
        """,
    )

    op.create_index(
        "idx_appointments_patient_id",
        "appointments",
        ["patient_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "idx_appointments_patient_id",
        table_name="appointments",
    )

    op.drop_constraint(
        "valid_cause",
        "appointments",
        type_="check",
    )

    op.drop_constraint(
        "appointments_patient_id_fkey",
        "appointments",
        type_="foreignkey",
    )

    op.drop_column("appointments", "cause")
    op.drop_column("appointments", "patient_id")

    op.drop_table("patients")