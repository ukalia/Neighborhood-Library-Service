import logging
import uuid
from contextvars import ContextVar

# Context variable for request correlation
request_id_var: ContextVar[str] = ContextVar('request_id', default=None)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with correlation ID support"""
    return logging.getLogger(name)


def set_request_id(request_id: str = None):
    """Set correlation ID for request tracking"""
    if request_id is None:
        request_id = str(uuid.uuid4())
    request_id_var.set(request_id)
    return request_id


def get_request_id():
    """Get current correlation ID"""
    return request_id_var.get()


class LogContext:
    """Context manager for structured logging with additional context"""
    def __init__(self, logger, **context):
        self.logger = logger
        self.context = context

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def info(self, msg, **kwargs):
        self.logger.info(msg, extra={**self.context, **kwargs})

    def error(self, msg, **kwargs):
        self.logger.error(msg, extra={**self.context, **kwargs})

    def warning(self, msg, **kwargs):
        self.logger.warning(msg, extra={**self.context, **kwargs})
