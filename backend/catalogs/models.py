from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=255)
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='categories', null=True)
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Categories"
        unique_together = ('name', 'store')
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class Item(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='items', null=True)
    code = models.CharField(max_length=50, null=True, blank=True)
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='items/', null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
