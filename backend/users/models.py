from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    MEMBER = 'member'
    LIBRARIAN = 'librarian'

    ROLE_CHOICES = [
        (MEMBER, 'Member'),
        (LIBRARIAN, 'Librarian'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=MEMBER
    )
    phone_number = models.CharField(max_length=15, null=True, blank=True)
    address = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_member(self):
        return self.role == self.MEMBER

    @property
    def is_librarian(self):
        return self.role == self.LIBRARIAN

    def can_borrow_books(self):
        return self.is_active and self.is_member

    def can_manage_library(self):
        return self.is_active and (self.is_librarian or self.is_superuser)
