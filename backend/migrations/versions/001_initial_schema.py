"""Create initial appointments table."""

from alembic import op
import sqlalchemy as sa


revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "appointment_id",
            sa.String(length=50),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "department",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "scheduled_time",
            sa.DateTime(),
            nullable=False,
        ),
        sa.Column(
            "arrival_time",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "completion_time",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="scheduled",
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
        sa.CheckConstraint(
            """
            status IN (
                'scheduled',
                'waiting',
                'in_progress',
                'completed',
                'cancelled',
                'no_show'
            )
            """,
            name="valid_status",
        ),
    )


def downgrade() -> None:
    op.drop_table("appointments")