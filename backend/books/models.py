from django.conf import settings
from django.db import models
from django.db.models import CheckConstraint, Q

from core.models import BaseModel


class Author(BaseModel):
    name = models.CharField(max_length=256)
    nationality = models.CharField(max_length=128, null=True, blank=True)

    class Meta:
        db_table = 'authors'

    def __str__(self):
        return self.name


class Book(BaseModel):
    title = models.CharField(max_length=256)
    author = models.ForeignKey(Author, on_delete=models.PROTECT, related_name='books')
    isbn = models.CharField(max_length=20, null=True, blank=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = 'books'
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['author'])
        ]

    def __str__(self):
        return f"{self.title} by {self.author.name}"


class BookCopy(BaseModel):
    AVAILABLE = 'available'
    BORROWED = 'borrowed'
    LOST = 'lost'
    MAINTENANCE = 'maintenance'
    STATUS_CHOICES = [
        (AVAILABLE, 'Available'),
        (BORROWED, 'Borrowed'),
        (LOST, 'Lost'),
        (MAINTENANCE, 'Maintenance')
    ]

    book = models.ForeignKey(Book, on_delete=models.PROTECT, related_name='copies')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=AVAILABLE)
    barcode = models.CharField(max_length=128, unique=True)
    borrowed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='active_borrowed_copies',
        null=True, blank=True
    )

    class Meta:
        constraints = [
            CheckConstraint(
                check=(
                    Q(status='available', borrowed_by__isnull=True) |
                    Q(status='borrowed', borrowed_by__isnull=False) |
                    Q(status='lost') |
                    Q(status='maintenance', borrowed_by__isnull=True)
                ),
                name='copy_status_borrower_constraint'
            )
        ]
        db_table = 'book_copies'
        indexes = [
            models.Index(fields=['barcode']),
            models.Index(fields=['borrowed_by']),
            models.Index(fields=['book', 'status'])
        ]

    def __str__(self):
        return f"{self.book.title} - {self.barcode}"


class Transaction(BaseModel):
    book_copy = models.ForeignKey(BookCopy, on_delete=models.PROTECT, related_name='transactions')
    borrowed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='borrowed_book_copies'
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='issued_transactions',
        null=True, blank=True
    )
    returned_at = models.DateTimeField(null=True, blank=True)
    fine = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    fine_collected = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['book_copy'],
                condition=Q(returned_at__isnull=True),
                name='one_active_transaction_per_copy'
            )
        ]
        db_table = 'book_transactions'
        indexes = [
            models.Index(fields=['book_copy']),
            models.Index(fields=['borrowed_by']),
            models.Index(fields=['fine_collected'])
        ]

    def __str__(self):
        return f"{self.book_copy} borrowed by {self.borrowed_by.username}"


class LibraryConfig(BaseModel):
    max_borrow_days_without_fine = models.IntegerField(
        default=14,
        help_text="Number of days before fines start accruing"
    )
    fine_per_day = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.00,
        help_text="Fine amount per day after due date"
    )
    max_books_per_member = models.IntegerField(
        default=3,
        help_text="Maximum number of books a member can borrow simultaneously"
    )

    class Meta:
        db_table = 'library_config'
        verbose_name = 'Library Configuration'
        verbose_name_plural = 'Library Configuration'

    @classmethod
    def get_instance(cls):
        config, created = cls.objects.get_or_create(pk=1)
        return config

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    def __str__(self):
        return f"Library Config (Max borrow days: {self.max_borrow_days_without_fine}, Fine per day: {self.fine_per_day})"
