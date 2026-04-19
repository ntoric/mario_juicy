from django.db import models
from django.core.exceptions import ValidationError

class TaxConfiguration(models.Model):
    TAX_TYPE_CHOICES = [
        ('INCLUSIVE', 'Inclusive'),
        ('EXCLUSIVE', 'Exclusive'),
        ('EXEMPTED', 'Exempted'),
    ]

    name = models.CharField(max_length=100, default="Default Tax Configuration")
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='tax_configurations', null=True)
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES, default='EXCLUSIVE')
    
    # GST Configuration
    is_gst_enabled = models.BooleanField(default=False)
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # CESS Configuration
    is_cess_enabled = models.BooleanField(default=False)
    cess_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tax Configuration"
        verbose_name_plural = "Tax Configurations"

    def __str__(self):
        return self.name

    def clean(self):
        if self.is_gst_enabled:
            # Basic validation: GST components should ideally sum to total percentage for intra-state
            # but we allow flexibility as per user requirements
            pass
        super().clean()

    @classmethod
    def get_solo(cls):
        # Compatibility with legacy code
        return cls.get_for_store(None)

    @classmethod
    def get_for_store(cls, store):
        try:
            if not store:
                # Use ID=1 configuration as fallback
                return cls.objects.get_or_create(id=1)[0]
            obj, created = cls.objects.get_or_create(store=store)
            return obj
        except Exception:
            # Fallback for pending migrations - if 'store' field doesn't exist yet
            # we return the default singleton record
            try:
                return cls.objects.get_or_create(id=1)[0]
            except Exception:
                # Ultimate fallback if table itself is an issue
                return cls()
