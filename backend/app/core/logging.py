import logging
import sys


def setup_logging(log_level: str = "INFO") -> None:
    """Configure structured console logging for FitSphere."""
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level.upper())

    # Avoid duplicate handlers on re-runs
    if not root_logger.handlers:
        root_logger.addHandler(handler)
    else:
        root_logger.handlers = [handler]

    # Suppress verbose third-party loggers if desired
    logging.getLogger("uvicorn.access").handlers = [handler]


logger = logging.getLogger("fitsphere")
