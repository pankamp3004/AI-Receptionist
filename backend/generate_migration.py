import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))
from alembic.config import Config
from alembic import command

try:
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    command.revision(alembic_cfg, autogenerate=True, message="Add SuperAdmin, TenantSubscription, and AI model config")
    command.upgrade(alembic_cfg, "head")
    print("Migration generated and applied successfully.")
except Exception as e:
    with open("err.txt", "w") as f:
        traceback.print_exc(file=f)
    print(f"Error during migration: {e}")
    sys.exit(1)
