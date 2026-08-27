from sqlalchemy import text
from sqlalchemy.pool import NullPool

from app.config import Settings
from app.db import create_engine_for


def test_sqlite_uses_wal_and_foreign_keys(tmp_path) -> None:
    settings = Settings(database_url=f"sqlite:///{tmp_path / 'gushi.db'}")
    engine = create_engine_for(settings)

    with engine.connect() as connection:
        journal_mode = connection.execute(text("PRAGMA journal_mode")).scalar_one()
        foreign_keys = connection.execute(text("PRAGMA foreign_keys")).scalar_one()

    assert journal_mode.lower() == "wal"
    assert foreign_keys == 1


def test_file_sqlite_does_not_reuse_connections_across_processes(tmp_path) -> None:
    settings = Settings(database_url=f"sqlite:///{tmp_path / 'gushi.db'}")
    engine = create_engine_for(settings)

    assert isinstance(engine.pool, NullPool)
