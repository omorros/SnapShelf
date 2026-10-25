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


def test_app_imports_without_java(tmp_path):
    # Only the image-barcode endpoint needs Java; the app must start on machines without it
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{tmp_path / 'nojava.db'}", "PATH": "/nonexistent"}

    result = subprocess.run([sys.executable, "-c", "import app.main"], cwd=API_DIR, env=env,
                            capture_output=True, text=True)

    assert result.returncode == 0, result.stderr[-500:]


def test_postgres_urls_resolve_a_driver():
    # The documented DATABASE_URL is postgresql://...; building the engine must not need a missing driver
    engine = create_engine("postgresql://user:password@localhost:5432/snapshelf")

    assert engine.dialect.name == "postgresql"
