from django.utils.crypto import get_random_string
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from users.models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model - basic user information.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone_number', 'address', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that adds role information to the token payload.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['role'] = user.role
        token['email'] = user.email

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add user data to response
        data['user'] = UserSerializer(self.user).data

        return data


class MemberSerializer(serializers.ModelSerializer):
    """
    Serializer for member management by librarians.
    Filters users with role=MEMBER and provides additional borrow statistics.
    """
    active_borrows_count = serializers.SerializerMethodField()
    total_borrows_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                  'phone_number', 'address', 'is_active', 'date_joined',
                  'active_borrows_count', 'total_borrows_count')
        read_only_fields = ('id', 'date_joined')

    def get_active_borrows_count(self, obj):
        # Use annotated value if available (from optimized queryset)
        if hasattr(obj, 'active_borrows_count'):
            return obj.active_borrows_count
        # Fallback to query for backwards compatibility
        from books.models import BookCopy
        return obj.active_borrowed_copies.filter(status=BookCopy.BORROWED).count()

    def get_total_borrows_count(self, obj):
        # Use annotated value if available (from optimized queryset)
        if hasattr(obj, 'total_borrows_count'):
            return obj.total_borrows_count
        # Fallback to query for backwards compatibility
        return obj.borrowed_book_copies.count()

    def create(self, validated_data):
        validated_data['role'] = User.MEMBER
        if 'password' not in validated_data:
            validated_data['password'] = get_random_string(12)
        return User.objects.create_user(**validated_data)
