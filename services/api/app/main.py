from fastapi import FastAPI

from .config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Gushi API", version="0.1.0")
    app.state.settings = settings or Settings()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "gushi-api"}

    return app


app = create_app()
