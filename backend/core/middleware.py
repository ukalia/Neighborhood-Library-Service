import logging
from core.logging import set_request_id, get_request_id

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware:
    """Middleware to add correlation IDs and log requests"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = set_request_id()
        request.request_id = request_id

        logger.info(
            f"Request started: {request.method} {request.path}",
            extra={
                'request_id': request_id,
                'method': request.method,
                'path': request.path,
                'user': str(request.user) if request.user.is_authenticated else 'anonymous'
            }
        )

        response = self.get_response(request)

        logger.info(
            f"Request completed: {request.method} {request.path}",
            extra={
                'request_id': request_id,
                'status_code': response.status_code,
                'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
                'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
            }
        )

        return response
