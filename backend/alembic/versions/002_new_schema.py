"""New finalized hospital schema with org-level multi-tenancy

Revision ID: 002_new_schema
Revises: 001_initial
Create Date: 2026-02-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002_new_schema'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def _create_enum_safe(name: str, *values: str) -> None:
    """Create a PostgreSQL ENUM type only if it does not already exist."""
    vals = ", ".join(f"'{v}'" for v in values)
    op.execute(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN
                CREATE TYPE {name} AS ENUM ({vals});
            END IF;
        END
        $$;
    """)


# Dialect-specific ENUM helpers — create_type=False means SQLAlchemy will NEVER
# try to CREATE the type; we manage creation manually above.
def _gender():
    return postgresql.ENUM('Male', 'Female', 'Other',
                           name='gender_enum', create_type=False)


def _weekday():
    return postgresql.ENUM(
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
        name='weekday_enum', create_type=False)


def _shift_status():
    return postgresql.ENUM('Active', 'Inactive', 'OnLeave',
                           name='shift_status_enum', create_type=False)


def _doctor_status():
    return postgresql.ENUM('Active', 'Inactive', 'Retired',
                           name='doctor_status_enum', create_type=False)


def _appt_status():
    return postgresql.ENUM(
        'Booked', 'Scheduled', 'Completed', 'Cancelled', 'NoShow', 'Rescheduled',
        name='appointment_status_enum', create_type=False)


def upgrade() -> None:
    # ── 1. Drop old tables (FK-safe order) ────────────────────────────────────
    for tbl in [
        'call_logs', 'ai_configurations', 'appointments',
        'patients', 'doctor_schedules', 'doctors',
    ]:
        op.execute(f'DROP TABLE IF EXISTS "{tbl}" CASCADE')

    # ── 2. Create ENUM types (idempotent via DO block) ─────────────────────────
    _create_enum_safe('appointment_status_enum',
                      'Booked', 'Scheduled', 'Completed', 'Cancelled', 'NoShow', 'Rescheduled')
    _create_enum_safe('shift_status_enum', 'Active', 'Inactive', 'OnLeave')
    _create_enum_safe('doctor_status_enum', 'Active', 'Inactive', 'Retired')
    _create_enum_safe('gender_enum', 'Male', 'Female', 'Other')
    _create_enum_safe('weekday_enum',
                      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')

    # ── 3. patient_account ────────────────────────────────────────────────────
    op.create_table(
        'patient_account',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mobile_no', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('organization_id', 'mobile_no', name='uq_patient_account_org_mobile'),
    )
    op.create_index('ix_patient_account_org_id', 'patient_account', ['organization_id'])
    op.create_index('ix_patient_account_mobile', 'patient_account', ['mobile_no'])

    # ── 4. patient ────────────────────────────────────────────────────────────
    op.create_table(
        'patient',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('patient_account.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('gender', _gender(), nullable=True),
        sa.Column('dob', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_patient_org_id', 'patient', ['organization_id'])
    op.create_index('ix_patient_account_id', 'patient', ['account_id'])

    # ── 5. specialty ──────────────────────────────────────────────────────────
    op.create_table(
        'specialty',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('spec_name', sa.String(100), nullable=False),
        sa.UniqueConstraint('organization_id', 'spec_name', name='uq_specialty_org_name'),
    )
    op.create_index('ix_specialty_org_id', 'specialty', ['organization_id'])
    op.create_index('ix_specialty_name', 'specialty', ['spec_name'])

    # ── 6. symptoms ───────────────────────────────────────────────────────────
    op.create_table(
        'symptoms',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sym_name', sa.String(100), nullable=False),
        sa.UniqueConstraint('organization_id', 'sym_name', name='uq_symptom_org_name'),
    )
    op.create_index('ix_symptoms_org_id', 'symptoms', ['organization_id'])
    op.create_index('ix_symptoms_name', 'symptoms', ['sym_name'])

    # ── 7. doctor ─────────────────────────────────────────────────────────────
    op.create_table(
        'doctor',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('experiences', sa.Integer(), nullable=True),
        sa.Column('degree_doc', sa.String(100), nullable=True),
        sa.Column('status', _doctor_status(), nullable=False, server_default='Active'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint('experiences >= 0', name='chk_doctor_experience_non_negative'),
    )
    op.create_index('ix_doctor_org_id', 'doctor', ['organization_id'])
    op.create_index('ix_doctor_name', 'doctor', ['name'])

    # ── 8. doctor_specialty (M:N) ─────────────────────────────────────────────
    op.create_table(
        'doctor_specialty',
        sa.Column('doc_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('doctor.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('spec_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('specialty.id', ondelete='CASCADE'), primary_key=True),
    )

    # ── 9. doc_shift ─────────────────────────────────────────────────────────
    op.create_table(
        'doc_shift',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doc_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('doctor.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_of_week', _weekday(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('status', _shift_status(), nullable=False, server_default='Active'),
        sa.CheckConstraint('start_time < end_time', name='chk_shift_times'),
    )
    op.create_index('ix_doc_shift_org_id', 'doc_shift', ['organization_id'])
    op.create_index('ix_doc_shift_doc_id', 'doc_shift', ['doc_id'])

    # ── 10. appointment ───────────────────────────────────────────────────────
    op.create_table(
        'appointment',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('account_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('patient_account.id', ondelete='CASCADE'), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('patient.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('doctor.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('date_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('app_status', _appt_status(), nullable=False, server_default='Booked'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_appointment_org_id', 'appointment', ['organization_id'])
    op.create_index('ix_appointment_doctor_id', 'appointment', ['doctor_id'])
    op.create_index('ix_appointment_patient_id', 'appointment', ['patient_id'])
    op.create_index('ix_appointment_account_id', 'appointment', ['account_id'])

    # Prevent double-booking — partial unique index (IF NOT EXISTS = safe to re-run)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_doctor_appointment_time
        ON appointment (doctor_id, date_time)
        WHERE app_status NOT IN ('Cancelled', 'NoShow')
    """)

    # ── 11. patient_memory ────────────────────────────────────────────────────
    op.create_table(
        'patient_memory',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('app_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('appointment.id', ondelete='CASCADE'), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
    )
    op.create_index('ix_patient_memory_org_id', 'patient_memory', ['organization_id'])
    op.create_index('ix_patient_memory_app_id', 'patient_memory', ['app_id'])

    # ── 12. spec_sym ──────────────────────────────────────────────────────────
    op.create_table(
        'spec_sym',
        sa.Column('spec_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('specialty.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('sym_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('symptoms.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('confidence', sa.Numeric(3, 2), nullable=True, server_default='1.0'),
    )

    # ── 13. user_memory ───────────────────────────────────────────────────────
    op.create_table(
        'user_memory',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('phone_number', sa.String(64), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('name', sa.String(128), nullable=True),
        sa.Column('last_summary', sa.Text(), nullable=True),
        sa.Column('last_call', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('call_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('organization_id', 'phone_number', name='uq_user_memory_org_phone'),
    )
    op.create_index('ix_user_memory_org_id', 'user_memory', ['organization_id'])
    op.create_index('ix_user_memory_email', 'user_memory', ['email'])
    op.create_index('ix_user_memory_last_call', 'user_memory', ['last_call'])
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_memory_approved
        ON user_memory (is_approved)
        WHERE is_approved = TRUE
    """)

    # ── 14. call_session ──────────────────────────────────────────────────────
    op.create_table(
        'call_session',
        sa.Column('session_id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('phone_number', sa.String(64), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('intent', sa.Text(), nullable=True),
        sa.Column('outcome', sa.Text(), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('confidence_score', sa.Numeric(3, 2), nullable=True),
    )
    op.create_index('ix_call_session_org_id', 'call_session', ['organization_id'])
    op.create_index('ix_call_session_phone', 'call_session', ['phone_number'])

    # ── 15. ai_configurations (kept for admin dashboard) ──────────────────────
    op.create_table(
        'ai_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'),
                  nullable=False, unique=True),
        sa.Column('specialty_mappings', postgresql.JSONB(), nullable=False,
                  server_default='{}'),
        sa.Column('symptom_mappings', postgresql.JSONB(), nullable=False,
                  server_default='{}'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_ai_configurations_organization_id',
                    'ai_configurations', ['organization_id'])


def downgrade() -> None:
    for tbl in [
        'call_session', 'user_memory', 'spec_sym', 'patient_memory',
        'ai_configurations', 'appointment', 'doc_shift', 'doctor_specialty',
        'doctor', 'specialty', 'symptoms', 'patient', 'patient_account',
    ]:
        op.execute(f'DROP TABLE IF EXISTS "{tbl}" CASCADE')

    for enum_name in [
        'appointment_status_enum', 'shift_status_enum',
        'doctor_status_enum', 'gender_enum', 'weekday_enum',
    ]:
        op.execute(f'DROP TYPE IF EXISTS {enum_name} CASCADE')

    # Restore old tables
    op.create_table(
        'doctors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('specialty', sa.String(255), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'doctor_schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_of_week', sa.String(20), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
    )
    op.create_table(
        'patients',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'appointments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('appointment_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='scheduled'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'call_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('patient_phone', sa.String(50), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
