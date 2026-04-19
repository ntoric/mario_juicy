from rest_framework import serializers
from .models import Store

class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = [
            'id', 'name', 'address', 'phone', 'email', 'gst_number', 
            'location', 'fssai_lic_no', 'mobile', 'invoice_prefix', 'logo',
            'is_active', 'is_kitchen_step_enabled', 'is_take_away_enabled', 
            'is_reservations_enabled', 'thermal_printer_size',
            'created_at', 'updated_at'
        ]
