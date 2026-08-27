from collections.abc import Iterator

import pytest
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import create_engine_for, create_session_factory
from app.models import Base


@pytest.fixture
def session(tmp_path) -> Iterator[Session]:
    settings = Settings(database_url=f"sqlite:///{tmp_path / 'test.db'}")
    engine = create_engine_for(settings)
    Base.metadata.create_all(engine)
    db_session = create_session_factory(engine)()
    try:
        yield db_session
    finally:
        db_session.close()
        engine.dispose()
