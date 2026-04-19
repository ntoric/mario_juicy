from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from catalogs.models import Item

class Table(models.Model):
    STATUS_CHOICES = [
        ('VACANT', 'Vacant'),
        ('PARTIALLY_OCCUPIED', 'Partially Occupied'),
        ('OCCUPIED', 'Occupied'),
        ('RESERVED', 'Reserved'),
        ('MAINTENANCE', 'Maintenance'),
    ]

    number = models.CharField(max_length=20)
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='tables', null=True)
    capacity = models.PositiveIntegerField(default=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='VACANT')
    is_active = models.BooleanField(default=True)
    # Map layout position (percentage of canvas)
    pos_x = models.FloatField(default=10.0)   # X position in % of canvas width
    pos_y = models.FloatField(default=10.0)   # Y position in % of canvas height
    shape = models.CharField(
        max_length=10,
        choices=[('RECT', 'Rectangle'), ('CIRCLE', 'Circle')],
        default='RECT'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('number', 'store')
        ordering = ['number']

    def update_status(self):
        """
        Recalculates the table's status based on current active orders.
        Can be called whenever orders are created, closed, or moved.
        """
        # Use centralized terminal statuses from Order model
        TERMINAL_STATUSES = Order.TERMINAL_STATUSES
        
        # Get sum of persons in active orders for this table
        # We use 'self.orders.all()' instead of filtering Order model directly to avoid some circularity issues
        active_orders = self.orders.exclude(status__in=TERMINAL_STATUSES)
        total_persons = active_orders.aggregate(
            total=models.Sum('number_of_persons')
        )['total'] or 0
        
        new_status = 'VACANT'
        if total_persons > 0:
            if total_persons < self.capacity:
                new_status = 'PARTIALLY_OCCUPIED'
            else:
                new_status = 'OCCUPIED'
        
        # Check for upcoming reservations if vacant
        if new_status == 'VACANT':
            now = timezone.now()
            window_end = now + timedelta(minutes=30)
            
            has_upcoming_reservation = self.reservations.filter(
                status='CONFIRMED',
                reservation_time__gte=now,
                reservation_time__lte=window_end
            ).exists()
            
            if has_upcoming_reservation:
                new_status = 'RESERVED'
        
        if self.status != new_status:
            self.status = new_status
            self.save(update_fields=['status'])
        
        return new_status

    def __str__(self):
        return f"Table {self.number}"

class Order(models.Model):
    STATUS_CHOICES = [
        ('ORDER_TAKEN', 'Order Taken'),
        ('AWAITING', 'Awaiting'),
        ('PREPARING', 'Preparing'),
        ('READY', 'Ready to Serve'),
        ('SERVED', 'Served'),
        ('COMPLETED', 'Completed'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
        ('REJECTED', 'Rejected'),
        ('RETURNED', 'Returned (Loss)'),
    ]

    TERMINAL_STATUSES = ['PAID', 'CANCELLED', 'COMPLETED', 'RETURNED', 'REJECTED']

    ORDER_TYPE_CHOICES = [
        ('DINE_IN', 'Dine-in'),
        ('TAKE_AWAY', 'Parcel'),
    ]

    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='orders', null=True)
    waiter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='restaurant_orders')
    
    # Customer details for Parcel/Take-away
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    customer_mobile = models.CharField(max_length=20, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ORDER_TAKEN')
    number_of_persons = models.PositiveIntegerField(default=1)
    order_type = models.CharField(max_length=20, choices=ORDER_TYPE_CHOICES, default='DINE_IN')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        ordering = ['-created_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Track initial state to handle status updates
        self._initial_table_id = self.table_id
        self._initial_status = self.status

    def __str__(self):
        return f"Order {self.id} - {self.get_order_type_display()} ({self.table.number if self.table else 'No Table'})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.order_type == 'DINE_IN' and not self.table:
            raise ValidationError("Dine-in orders must be associated with a table.")
        if self.order_type == 'TAKE_AWAY' and self.table:
            raise ValidationError("Parcel orders cannot be associated with a table.")

    def save(self, *args, **kwargs):
        # Auto-inherit store from table if missing (for Dine-in)
        if not self.store and self.table:
            self.store = self.table.store
            
        # Ensure Parcel orders never have a table
        if self.order_type == 'TAKE_AWAY':
            self.table = None
            
        status_changed = self._initial_status != self.status
        
        self.full_clean(exclude=['waiter']) # Run validation
        super().save(*args, **kwargs)
        
        # Propagation logic: If order status advances, sync items
        if status_changed:
            if self.status in ['SERVED', 'READY', 'COMPLETED', 'PAID']:
                # Filter for items that are not yet served/ready
                target_item_status = self.status if self.status in ['SERVED', 'READY'] else 'SERVED'
                self.items.filter(
                    status__in=['ORDERED', 'AWAITING', 'PREPARING', 'READY']
                ).exclude(status=target_item_status).update(status=target_item_status)
            
            elif self.status == 'CANCELLED':
                self.items.exclude(status='CANCELLED').update(status='CANCELLED')
            
            elif self.status == 'REJECTED':
                self.items.exclude(status='REJECTED').update(status='REJECTED')

        # Automate table status for Dine-in orders
        if self.table and self.order_type == 'DINE_IN':
            self.table.update_status()
            
        # If order was moved, update the old table as well
        if self._initial_table_id and self._initial_table_id != self.table_id:
            try:
                old_table = Table.objects.get(id=self._initial_table_id)
                old_table.update_status()
            except Table.DoesNotExist:
                pass
            
        # Update tracking
        self._initial_table_id = self.table_id


    def update_total_amount(self):
        from django.db.models import Sum, F
        total = self.items.exclude(status='CANCELLED').aggregate(
            total=Sum(F('price') * F('quantity'), output_field=models.DecimalField())
        )['total'] or 0
        self.total_amount = total
        self.save(update_fields=['total_amount'])

class OrderItem(models.Model):
    STATUS_CHOICES = [
        ('ORDERED', 'Ordered'),
        ('AWAITING', 'Awaiting'),
        ('PREPARING', 'Preparing'),
        ('READY', 'Ready'),
        ('SERVED', 'Served'),
        ('CANCELLED', 'Cancelled'),
        ('REJECTED', 'Rejected'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='restaurant_order_items')
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Snapshot of price at time of order
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ORDERED')
    notes = models.CharField(max_length=255, blank=True, null=True)
    rejection_note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_line_price(self):
        return self.quantity * self.price


    def __str__(self):
        return f"{self.quantity} x {self.item.name} (Order {self.order.id})"

class Reservation(models.Model):
    STATUS_CHOICES = [
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]

    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='reservations')
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='reservations', null=True)
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=20)
    reservation_time = models.DateTimeField()
    number_of_guests = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CONFIRMED')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reservation_time']

    def __str__(self):
        return f"{self.customer_name} - {self.reservation_time} (Table {self.table.number})"

class Invoice(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('CARD', 'Card'),
        ('UPI', 'UPI'),
        ('NET_BANKING', 'Net Banking'),
        ('EXTERNAL', 'External/Outside'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True)
    store = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='invoices', null=True)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    
    # Financial breakdown
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_details = models.JSONField(default=dict)  # Breakdown of CGST, SGST, CESS etc.
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='EXTERNAL')
    waiter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='generated_invoices')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.invoice_number

    @classmethod
    def generate_invoice_number(cls):
        from datetime import datetime
        import random
        prefix = "INV"
        timestamp = datetime.now().strftime("%Y%m%d%H%M")
        random_str = ''.join(random.choices('0123456789', k=4))
        return f"{prefix}-{timestamp}-{random_str}"
