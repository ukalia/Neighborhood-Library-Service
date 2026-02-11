from django.db import models


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
    
    def __str__(self):
        return f"{self.__class__.__name__} : {self.pk}"
    
    def save(self, *args, **kwargs):
        if 'update_fields' in kwargs:
            kwargs['update_fields'] = frozenset(kwargs['update_fields']) | {'updated_at'}
        super().save(*args, **kwargs)

