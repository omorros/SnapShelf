"""
Test configuration and shared fixtures.

Provides a throwaway SQLite database, a FastAPI TestClient,
and authenticated user fixtures for API endpoint testing.
"""
import os
import tempfile
from pathlib import Path
import pytest
from uuid import uuid4

# Set test environment variables BEFORE any app imports
TEST_DB = Path(tempfile.mkdtemp(prefix="snapshelf-tests-")) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-unit-tests"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["OPENAI_API_KEY"] = "test-key-not-real"

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.main import app


engine = create_engine(
    os.environ["DATABASE_URL"],
    connect_args={"check_same_thread": False},
)

# Enable foreign key support in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Provide a database session for tests."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a test user in the database and return (user, plain_password)."""
    plain_password = "testpassword123"
    user = User(
        id=uuid4(),
        email="test@example.com",
        hashed_password=hash_password(plain_password),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user, plain_password


@pytest.fixture
def auth_token(test_user):
    """Create a valid JWT token for the test user."""
    user, _ = test_user
    return create_access_token(user_id=user.id)


@pytest.fixture
def auth_headers(auth_token):
    """Return Authorization headers for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}"}
