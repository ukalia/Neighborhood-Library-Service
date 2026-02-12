from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class that returns an empty results list
    instead of raising a 404 error when requesting a page beyond
    the available data.

    Also allows clients to specify page size via 'page_size' query parameter.
    """
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        """
        Paginate a queryset if required, either returning a page object,
        or `None` if pagination is not configured for this view.
        """
        page_size = self.get_page_size(request)
        if not page_size:
            return None

        paginator = self.django_paginator_class(queryset, page_size)
        page_number = self.get_page_number(request, paginator)

        try:
            self.page = paginator.page(page_number)
        except Exception:
            # If the page is out of range, return an empty page
            # instead of raising a 404 error
            self.page = paginator.page(1)
            self.page.object_list = []
            return list(self.page)

        if paginator.num_pages > 1 and self.template is not None:
            self.display_page_controls = True

        self.request = request
        return list(self.page)

    def get_paginated_response(self, data):
        """
        Return a paginated response with metadata about the current page.
        """
        return Response({
            'count': self.page.paginator.count if hasattr(self, 'page') else 0,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })
