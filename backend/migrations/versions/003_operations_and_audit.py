"""Add departments, providers, appointment priority, notes, and audit logs."""

from alembic import op
import sqlalchemy as sa


revision = "003_operations_and_audit"
down_revision = "002_patients_and_causes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # Departments
    # ---------------------------------------------------------
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "department_id",
            sa.String(length=50),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
    )

    # ---------------------------------------------------------
    # Providers
    # ---------------------------------------------------------
    op.create_table(
        "providers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "provider_id",
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
            "department_id",
            sa.String(length=50),
            nullable=True,
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

    op.create_foreign_key(
        "providers_department_id_fkey",
        "providers",
        "departments",
        ["department_id"],
        ["department_id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "idx_providers_department_id",
        "providers",
        ["department_id"],
    )

    # ---------------------------------------------------------
    # Appointment fields
    # ---------------------------------------------------------
    op.add_column(
        "appointments",
        sa.Column(
            "provider_id",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "appointments",
        sa.Column(
            "priority",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "appointments",
        sa.Column(
            "operational_notes",
            sa.Text(),
            nullable=True,
        ),
    )

    # Existing appointments receive the default operational priority.
    op.execute(
        """
        UPDATE appointments
        SET priority = 'routine'
        WHERE priority IS NULL
        """
    )

    op.alter_column(
        "appointments",
        "priority",
        nullable=False,
        server_default="routine",
    )

    op.create_foreign_key(
        "appointments_provider_id_fkey",
        "appointments",
        "providers",
        ["provider_id"],
        ["provider_id"],
        ondelete="SET NULL",
    )

    op.create_check_constraint(
        "valid_priority",
        "appointments",
        """
        priority IN (
            'routine',
            'urgent',
            'emergency'
        )
        """,
    )

    op.create_index(
        "idx_appointments_provider_id",
        "appointments",
        ["provider_id"],
    )

    op.create_index(
        "idx_appointments_priority",
        "appointments",
        ["priority"],
    )

    # ---------------------------------------------------------
    # Audit logs
    # ---------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "appointment_id",
            sa.String(length=50),
            nullable=True,
        ),
        sa.Column(
            "action",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "actor",
            sa.String(length=100),
            nullable=False,
            server_default="system",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
    )

    op.create_foreign_key(
        "audit_logs_appointment_id_fkey",
        "audit_logs",
        "appointments",
        ["appointment_id"],
        ["appointment_id"],
        ondelete="CASCADE",
    )

    op.create_index(
        "idx_audit_logs_appointment_id",
        "audit_logs",
        ["appointment_id"],
    )

    op.create_index(
        "idx_audit_logs_created_at",
        "audit_logs",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "idx_audit_logs_created_at",
        table_name="audit_logs",
    )

    op.drop_index(
        "idx_audit_logs_appointment_id",
        table_name="audit_logs",
    )

    op.drop_constraint(
        "audit_logs_appointment_id_fkey",
        "audit_logs",
        type_="foreignkey",
    )

    op.drop_table("audit_logs")

    op.drop_index(
        "idx_appointments_priority",
        table_name="appointments",
    )

    op.drop_index(
        "idx_appointments_provider_id",
        table_name="appointments",
    )

    op.drop_constraint(
        "valid_priority",
        "appointments",
        type_="check",
    )

    op.drop_constraint(
        "appointments_provider_id_fkey",
        "appointments",
        type_="foreignkey",
    )

    op.drop_column("appointments", "operational_notes")
    op.drop_column("appointments", "priority")
    op.drop_column("appointments", "provider_id")

    op.drop_index(
        "idx_providers_department_id",
        table_name="providers",
    )

    op.drop_constraint(
        "providers_department_id_fkey",
        "providers",
        type_="foreignkey",
    )

    op.drop_table("providers")
    op.drop_table("departments")