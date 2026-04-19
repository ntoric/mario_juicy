from rest_framework import serializers
from .models import Table, Order, OrderItem, Reservation, Invoice
from catalogs.serializers import ItemSerializer


class TableSerializer(serializers.ModelSerializer):
    active_orders = serializers.SerializerMethodField()
    active_order = serializers.SerializerMethodField()
    current_occupancy = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = [
            'id', 'number', 'capacity', 'status', 'is_active', 
            'pos_x', 'pos_y', 'shape', 'active_order', 'active_orders',
            'current_occupancy', 'created_at', 'updated_at'
        ]

    def get_active_orders(self, obj):
        # Specifically exclude terminal statuses to find truly "active" orders
        active_orders = obj.orders.filter(order_type='DINE_IN').exclude(status__in=Order.TERMINAL_STATUSES)
        return [{
            'id': order.id,
            'status': order.status,
            'total_amount': str(order.total_amount),
            'waiter_name': order.waiter.get_full_name() if order.waiter else 'Staff',
            'customer_name': order.customer_name,
            'number_of_persons': order.number_of_persons,
            'order_type': order.order_type,
            'item_count': order.items.count(),
            'created_at': order.created_at
        } for order in active_orders]

    def get_active_order(self, obj):
        # Return the first active order for backward compatibility
        active_orders = obj.orders.filter(order_type='DINE_IN').exclude(status__in=Order.TERMINAL_STATUSES).order_by('created_at')
        active_order = active_orders.first()
        if active_order:
            return {
                'id': active_order.id,
                'status': active_order.status,
                'total_amount': str(active_order.total_amount),
                'waiter_name': active_order.waiter.get_full_name() if active_order.waiter else 'Staff',
                'customer_name': active_order.customer_name,
                'number_of_persons': active_order.number_of_persons,
                'order_type': active_order.order_type
            }
        return None

    def get_current_occupancy(self, obj):
        active_orders = obj.orders.exclude(status__in=Order.TERMINAL_STATUSES)
        from django.db.models import Sum
        return active_orders.aggregate(total=Sum('number_of_persons'))['total'] or 0



class OrderItemSerializer(serializers.ModelSerializer):
    item_details = ItemSerializer(source='item', read_only=True)
    order_table_number = serializers.CharField(source='order.table.number', read_only=True)
    order_table_id = serializers.IntegerField(source='order.table.id', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'order', 'order_table_number', 'order_table_id',
            'item', 'item_details', 'quantity', 'price',
            'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['order', 'price']

    def create(self, validated_data):
        # Snapshot price from catalog at time of ordering
        item = validated_data['item']
        validated_data['price'] = item.price
        return super().create(validated_data)


class InvoiceSerializer(serializers.ModelSerializer):
    waiter_name = serializers.SerializerMethodField()
    table_number = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    store_details = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'order', 'table_number', 'items', 'store_details',
            'subtotal', 'tax_amount', 'tax_details', 'total_amount', 
            'payment_method', 'waiter', 'waiter_name', 'created_at'
        ]
        read_only_fields = ['invoice_number', 'waiter']

    def get_store_details(self, obj):
        if obj.store:
            return {
                'name': obj.store.name,
                'address': obj.store.address,
                'location': obj.store.location,
                'fssai_lic_no': obj.store.fssai_lic_no,
                'mobile': obj.store.mobile,
                'phone': obj.phone if hasattr(obj, 'phone') else obj.store.phone,
                'gst_number': obj.store.gst_number,
                'thermal_printer_size': obj.store.thermal_printer_size,
            }
        return None

    def get_items(self, obj):
        from .serializers import OrderItemSerializer
        return OrderItemSerializer(obj.order.items.all(), many=True).data

    def get_waiter_name(self, obj):
        if obj.waiter:
            return obj.waiter.get_full_name() or obj.waiter.username
        return "Staff"

    def get_table_number(self, obj):
        if obj.order and obj.order.table:
            return obj.order.table.number
        return "Take Away"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    table_number = serializers.SerializerMethodField()
    waiter_name = serializers.SerializerMethodField()
    invoice = InvoiceSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'table', 'table_number', 'waiter', 'waiter_name', 'store',
            'customer_name', 'customer_mobile', 'number_of_persons',
            'status', 'order_type', 'total_amount', 'notes', 'items', 'invoice',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['total_amount', 'store']

    def get_table_number(self, obj):
        if obj.table:
            return obj.table.number
        return "Take Away"

    def get_waiter_name(self, obj):
        if obj.waiter:
            return obj.waiter.get_full_name() or obj.waiter.username
        return "Staff"



class ReservationSerializer(serializers.ModelSerializer):
    table_number = serializers.CharField(source='table.number', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'table', 'table_number', 'customer_name', 'customer_phone',
            'reservation_time', 'number_of_guests', 'status', 'notes',
            'created_at', 'updated_at'
        ]
