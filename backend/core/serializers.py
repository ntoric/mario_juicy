from rest_framework import serializers
from .models import TaxConfiguration

class TaxConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxConfiguration
        fields = [
            'id', 'name', 'tax_type', 
            'is_gst_enabled', 'cgst_rate', 'sgst_rate', 'igst_rate',
            'is_cess_enabled', 'cess_rate', 'is_active', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']
