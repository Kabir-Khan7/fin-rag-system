"""
Main application entry point for the Local RAG System.

Creates and configures the FastAPI application, sets up logging, registers
routes, and defines application-level endpoints.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.utils.logger import configure_logging, get_logger

# Configure application-wide logging before anything else.
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application startup and shutdown events.

    Code before 'yield' runs on startup; code after runs on shutdown.
    This is FastAPI's modern replacement for @app.on_event handlers.
    """
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="Phase 1: Source Collection - FastAPI backend connected to MS SQL Server.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Register all v1 API routes under the /api/v1 prefix.
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Verifies the API server is running and responsive.
    """
    return {"status": "ok", "message": "Local RAG System is running"}