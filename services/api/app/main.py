from fastapi import FastAPI

from .config import Settings
from .db import create_engine_for, create_session_factory
from .models import Base
from .routes import admin, quotes, stocks, sync


def create_app(settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Gushi API", version="0.1.0")
    app.state.settings = settings or Settings()
    app.state.engine = create_engine_for(app.state.settings)
    Base.metadata.create_all(app.state.engine)
    app.state.session_factory = create_session_factory(app.state.engine)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "gushi-api"}

    app.include_router(sync.router)
    app.include_router(stocks.router)
    app.include_router(quotes.router)
    app.include_router(admin.router)
    return app


app = create_app()
