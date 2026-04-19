import pytest
from django.urls import reverse
from rest_framework import status
from restaurants.models import Table, Order, OrderItem
from catalogs.models import Item

@pytest.mark.django_db
class TestStatusSync:
    def test_order_to_item_status_propagation(self, store, admin_client):
        # 1. Setup Table and Item
        table = Table.objects.create(number="T1", store=store, capacity=4)
        catalog_item = Item.objects.create(name="Burger", price=150, store=store)
        
        # 2. Create Order
        order = Order.objects.create(
            table=table, 
            store=store, 
            order_type='DINE_IN',
            status='ORDER_TAKEN'
        )
        
        # 3. Add Item to Order
        order_item = OrderItem.objects.create(
            order=order,
            item=catalog_item,
            quantity=1,
            price=catalog_item.price,
            status='PREPARING'
        )
        
        # 4. Update Order status to SERVED
        order.status = 'SERVED'
        order.save()
        
        # 5. Verify Item status propagated
        order_item.refresh_from_db()
        assert order_item.status == 'SERVED'
        
    def test_order_to_item_status_propagation_ready(self, store, admin_client):
        table = Table.objects.create(number="T1", store=store, capacity=4)
        catalog_item = Item.objects.create(name="Burger", price=150, store=store)
        order = Order.objects.create(table=table, store=store, order_type='DINE_IN', status='ORDER_TAKEN')
        order_item = OrderItem.objects.create(order=order, item=catalog_item, quantity=1, price=catalog_item.price, status='PREPARING')
        
        # Update Order status to READY
        order.status = 'READY'
        order.save()
        
        order_item.refresh_from_db()
        assert order_item.status == 'READY'

    def test_order_cancellation_propagation(self, store, admin_client):
        table = Table.objects.create(number="T1", store=store, capacity=4)
        catalog_item = Item.objects.create(name="Burger", price=150, store=store)
        order = Order.objects.create(table=table, store=store, order_type='DINE_IN', status='ORDER_TAKEN')
        order_item = OrderItem.objects.create(order=order, item=catalog_item, quantity=1, price=catalog_item.price, status='PREPARING')
        
        # Cancel Order
        order.status = 'CANCELLED'
        order.save()
        
        order_item.refresh_from_db()
        assert order_item.status == 'CANCELLED'
