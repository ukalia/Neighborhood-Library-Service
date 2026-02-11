"""
URL configuration for library_service project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from users.views import AuthViewSet, MemberViewSet
from books.views import (
    AuthorViewSet,
    BookViewSet,
    BookCopyViewSet,
    TransactionViewSet,
    BorrowingStatsViewSet,
    LibraryConfigViewSet
)

router = DefaultRouter()

# Authentication
router.register(r'auth', AuthViewSet, basename='auth')

# Librarian - Member Management
router.register(r'members', MemberViewSet, basename='member')

# Librarian - Catalog Management
router.register(r'authors', AuthorViewSet, basename='author')
router.register(r'books', BookViewSet, basename='book')
router.register(r'book-copies', BookCopyViewSet, basename='bookcopy')

# Librarian - Transaction Management
router.register(r'transactions', TransactionViewSet, basename='transaction')

# Librarian - Statistics & Reporting
router.register(r'borrowing-stats', BorrowingStatsViewSet, basename='borrowing-stats')

# Librarian - Configuration
router.register(r'library-config', LibraryConfigViewSet, basename='library-config')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
