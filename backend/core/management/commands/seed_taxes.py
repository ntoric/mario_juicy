from django.core.management.base import BaseCommand
from core.models import TaxConfiguration
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seeds default tax configuration for testing'

    def handle(self, *args, **options):
        tax_config = TaxConfiguration.get_solo()
        if not tax_config.is_active or not tax_config.is_gst_enabled:
            tax_config.name = "GST (Inclusive)"
            tax_config.tax_type = 'INCLUSIVE'
            tax_config.is_gst_enabled = True
            tax_config.cgst_rate = Decimal('2.50')
            tax_config.sgst_rate = Decimal('2.50')
            tax_config.is_active = True
            tax_config.save()
            self.stdout.write(self.style.SUCCESS('Successfully seeded default tax configuration'))
        else:
            self.stdout.write(self.style.WARNING('Tax configuration already exists, skipping seed'))
