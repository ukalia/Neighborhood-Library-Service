from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User
from users.serializers import CustomTokenObtainPairSerializer, MemberSerializer
from users.permissions import IsLibrarian, IsMember


class AuthViewSet(viewsets.GenericViewSet):
    """
    ViewSet for authentication endpoints.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Login endpoint - returns JWT access and refresh tokens with user data.

        POST /api/auth/login/
        Body: {"username": "...", "password": "..."}
        """
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """
        Refresh access token endpoint.

        POST /api/auth/refresh/
        Body: {"refresh": "..."}
        """
        from rest_framework_simplejwt.serializers import TokenRefreshSerializer
        from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

        try:
            serializer = TokenRefreshSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        except (TokenError, InvalidToken) as e:
            return Response(
                {'error': 'Token is invalid or expired', 'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Logout endpoint - blacklists the refresh token.

        POST /api/auth/logout/
        Body: {"refresh": "..."}
        Headers: Authorization: Bearer <access_token>
        """
        from rest_framework_simplejwt.exceptions import TokenError

        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {'message': 'Successfully logged out'},
                status=status.HTTP_200_OK
            )
        except TokenError as e:
            return Response(
                {'error': 'Invalid token', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Logout failed', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class MemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet for librarians to manage members.
    Filters users with role=MEMBER.
    """
    serializer_class = MemberSerializer
    permission_classes = [IsLibrarian]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    filterset_fields = ['is_active']
    ordering = ['-date_joined']

    def get_queryset(self):
        from books.models import BookCopy

        return User.objects.filter(role=User.MEMBER).annotate(
            active_borrows_count=Count(
                'active_borrowed_copies',
                filter=Q(active_borrowed_copies__status=BookCopy.BORROWED),
                distinct=True
            ),
            total_borrows_count=Count('borrowed_book_copies', distinct=True)
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def borrowing_history(self, request):
        """
        Get borrowing history.
        Librarians: Specify member_id query param to view any member's history.
        Members: View only their own history.
        """
        from books.models import Transaction
        from books.serializers import TransactionSerializer
        from django.shortcuts import get_object_or_404

        if request.user.can_manage_library():
            member_id = request.query_params.get('member_id')
            if not member_id:
                return Response(
                    {'error': 'member_id query parameter is required for librarians'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            member = get_object_or_404(User, id=member_id, role=User.MEMBER)
        else:
            if not request.user.can_borrow_books():
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            member = request.user

        transactions = Transaction.objects.filter(
            borrowed_by=member
        ).select_related('book_copy__book').order_by('-created_at')

        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def active_borrows(self, request):
        """
        Get currently borrowed books.
        Librarians: Specify member_id query param to view any member's active borrows.
        Members: View only their own active borrows.
        """
        from books.models import BookCopy
        from books.serializers import BookCopyDetailSerializer
        from django.shortcuts import get_object_or_404

        if request.user.can_manage_library():
            member_id = request.query_params.get('member_id')
            if not member_id:
                return Response(
                    {'error': 'member_id query parameter is required for librarians'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            member = get_object_or_404(User, id=member_id, role=User.MEMBER)
        else:
            if not request.user.can_borrow_books():
                return Response(
                    {'error': 'Access denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            member = request.user

        active_borrows = member.active_borrowed_copies.filter(
            status=BookCopy.BORROWED
        ).select_related('book')

        serializer = BookCopyDetailSerializer(active_borrows, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a member account"""
        from books.models import BookCopy

        member = self.get_object()

        if member.active_borrowed_copies.filter(status=BookCopy.BORROWED).exists():
            return Response(
                {'error': 'Cannot deactivate member with active borrows'},
                status=status.HTTP_400_BAD_REQUEST
            )

        member.is_active = False
        member.save()
        return Response({'status': 'member deactivated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a member account"""
        member = self.get_object()
        member.is_active = True
        member.save()
        return Response({'status': 'member activated'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsMember])
    def me(self, request):
        """Get current member's profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
