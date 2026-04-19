from django.db import models

class Store(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    gst_number = models.CharField(max_length=15, blank=True, null=True)
    invoice_prefix = models.CharField(max_length=10, default="INV", help_text="Prefix for invoice numbers (e.g., branch code)")
    logo = models.ImageField(upload_to='store_logos/', null=True, blank=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    fssai_lic_no = models.CharField(max_length=50, blank=True, null=True, verbose_name="FSSAI License No.")
    mobile = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_kitchen_step_enabled = models.BooleanField(default=True, help_text="If disabled, orders advance to Preparing status immediately after KOT creation and skip the Kitchen Display step.")
    is_take_away_enabled = models.BooleanField(default=True, help_text="Enable or disable the Parcel (Take Away) order feature for this store.")
    is_reservations_enabled = models.BooleanField(default=True, help_text="Enable or disable the Restaurant Reservations feature for this store.")
    THERMAL_PRINTER_SIZE_CHOICES = [
        ('2_INCH', '2 Inch'),
        ('3_INCH', '3 Inch'),
    ]
    thermal_printer_size = models.CharField(
        max_length=10, 
        choices=THERMAL_PRINTER_SIZE_CHOICES, 
        default='3_INCH',
        help_text="Size of the thermal printer used for invoices (2 inch or 3 inch)."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
