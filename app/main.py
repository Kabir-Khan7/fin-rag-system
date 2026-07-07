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
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exception_handlers import (
    database_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)


# Configure application-wide logging before anything else.
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown events."""
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="Phase 1: Source Collection - FastAPI backend connected to MS SQL Server.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Register global exception handlers.
# These intercept errors anywhere in the app and return consistent JSON.
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Register all v1 API routes under the /api/v1 prefix.
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Health check endpoint. Verifies the API server is running."""
    return {"status": "ok", "message": "Local RAG System is running"}