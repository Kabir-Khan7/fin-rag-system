"""
Standard error response schema.

Defines a consistent JSON shape for all error responses returned by the API.
A predictable error format makes it easier for clients (like the frontend)
to handle failures uniformly.
"""

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard structure for API error responses."""

    detail: str
    error_type: str