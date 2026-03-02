"""initial multi-tenant schema

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', sa.String(100), nullable=False, server_default='hospital'),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('timezone', sa.String(100), nullable=False, server_default='UTC'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'admins',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_admins_organization_id', 'admins', ['organization_id'])

    op.create_table(
        'doctors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('specialty', sa.String(255), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_doctors_organization_id', 'doctors', ['organization_id'])

    op.create_table(
        'doctor_schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_of_week', sa.String(20), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
    )
    op.create_index('ix_doctor_schedules_doctor_id', 'doctor_schedules', ['doctor_id'])
    op.create_index('ix_doctor_schedules_organization_id', 'doctor_schedules', ['organization_id'])

    op.create_table(
        'patients',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_patients_organization_id', 'patients', ['organization_id'])

    op.create_table(
        'appointments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('appointment_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='scheduled'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_appointments_organization_id', 'appointments', ['organization_id'])
    op.create_index('ix_appointments_doctor_id', 'appointments', ['doctor_id'])
    op.create_index('ix_appointments_patient_id', 'appointments', ['patient_id'])

    op.create_table(
        'ai_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('specialty_mappings', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('symptom_mappings', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_ai_configurations_organization_id', 'ai_configurations', ['organization_id'])

    op.create_table(
        'call_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('patient_phone', sa.String(50), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_call_logs_organization_id', 'call_logs', ['organization_id'])


def downgrade() -> None:
    op.drop_table('call_logs')
    op.drop_table('ai_configurations')
    op.drop_table('appointments')
    op.drop_table('patients')
    op.drop_table('doctor_schedules')
    op.drop_table('doctors')
    op.drop_table('admins')
    op.drop_table('organizations')
