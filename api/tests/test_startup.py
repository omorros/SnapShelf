"""
Tests for what happens when the backend starts against a fresh database.
"""
import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect

API_DIR = Path(__file__).resolve().parents[1]


def test_importing_the_app_creates_tables(tmp_path):
    db = tmp_path / "fresh.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db}"}

    subprocess.run([sys.executable, "-c", "import app.main"], cwd=API_DIR, env=env, check=True)

    tables = set(inspect(create_engine(f"sqlite:///{db}")).get_table_names())
    assert {"users", "draft_items", "inventory_items", "saved_recipes"} <= tables


def test_sql_logging_is_off_by_default():
    from app.core.database import engine

    assert engine.echo is False
