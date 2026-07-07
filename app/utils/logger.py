"""
Centralized logging configuration for the application.

Provides a single function to configure and retrieve loggers with a
consistent format across the entire codebase. Using one configuration
point ensures all modules log the same way, which is essential for
debugging and observability in production.
"""

import logging
import sys

# The format each log line will follow.
# Example: 2026-07-07 10:30:00 | INFO | app.main | Server started
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging(level: int = logging.INFO) -> None:
    """
    Configure the root logger for the application.

    Sets up a console handler with a consistent format. Called once at
    application startup. All module-level loggers inherit this config.

    Args:
        level: The minimum log level to emit (default: INFO).
    """
    # Get the root logger — all other loggers inherit from it.
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Avoid adding duplicate handlers if this is called more than once.
    if root_logger.handlers:
        return

    # Console handler — sends logs to standard output.
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    # Apply our consistent format.
    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT)
    console_handler.setFormatter(formatter)

    root_logger.addHandler(console_handler)


def get_logger(name: str) -> logging.Logger:
    """
    Retrieve a named logger for a specific module.

    Using __name__ as the logger name lets each log line show which module
    it came from, making logs easy to trace.

    Args:
        name: The logger name, typically __name__ of the calling module.

    Returns:
        logging.Logger: A configured logger instance.
    """
    return logging.getLogger(name)