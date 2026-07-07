"""
Global exception handlers for the FastAPI application.

These handlers intercept exceptions raised anywhere in the application and
convert them into clean, consistent JSON responses. Every error is logged
for observability, and internal details are never leaked to the client —
critical for a financial data API.
"""

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.logger import get_logger

logger = get_logger(__name__)


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """
    Handle expected HTTP exceptions (e.g., 404 Not Found, 400 Bad Request).

    These are intentional errors raised via HTTPException in the endpoints.
    We log them at WARNING level and return the clean detail message.
    """
    logger.warning(
        "HTTP %s on %s %s: %s",
        exc.status_code,
        request.method,
        request.url.path,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_type": "http_error"},
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle request validation errors (invalid/malformed request bodies).

    Raised automatically by FastAPI when incoming data fails Pydantic
    validation. We log the details and return a 422 with the specifics
    so the client knows what to fix.
    """
    logger.warning(
        "Validation error on %s %s: %s",
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "error_type": "validation_error"},
    )


async def database_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """
    Handle database errors (connection failures, constraint violations, etc.).

    We log the full error internally for diagnosis but return a generic
    message to the client — never leaking database structure or SQL details.
    """
    logger.error(
        "Database error on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=True,  # Include the full traceback in the log.
    )
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "A database error occurred. Please try again later.",
            "error_type": "database_error",
        },
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Handle any unexpected exception not caught by the handlers above.

    This is the final safety net. We log the full traceback and return a
    generic 500 so no internal details ever reach the client.
    """
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "error_type": "internal_error",
        },
    )