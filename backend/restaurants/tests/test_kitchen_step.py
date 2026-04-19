import pytest
from django.urls import reverse
from rest_framework import status
from restaurants.models import Order, OrderItem, Table
from stores.models import Store

@pytest.mark.django_db
class TestKitchenStepLogic:
    def setup_method(self):
        self.store = Store.objects.create(name="Test Store", is_kitchen_step_enabled=True)
        self.table = Table.objects.create(number="1", store=self.store, capacity=4)
        
    def test_send_to_kitchen_enabled(self, admin_client):
        """When kitchen step is enabled, status should become AWAITING."""
        order = Order.objects.create(table=self.table, store=self.store, order_type='DINE_IN')
        from catalogs.models import Item, Category
        cat = Category.objects.create(name="Cat", store=self.store)
        item = Item.objects.create(name="Item", price=10.0, category=cat, store=self.store)
        order_item = OrderItem.objects.create(order=order, item=item, quantity=1, price=10.0, status='ORDERED')
        
        url = reverse('order-send-to-kitchen', args=[order.id])
        response = admin_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        order_item.refresh_from_db()
        
        assert order.status == 'AWAITING'
        assert order_item.status == 'AWAITING'

    def test_send_to_kitchen_disabled(self, admin_client):
        """When kitchen step is disabled, status should become PREPARING."""
        self.store.is_kitchen_step_enabled = False
        self.store.save()
        
        order = Order.objects.create(table=self.table, store=self.store, order_type='DINE_IN')
        from catalogs.models import Item, Category
        cat = Category.objects.create(name="Cat", store=self.store)
        item = Item.objects.create(name="Item", price=10.0, category=cat, store=self.store)
        order_item = OrderItem.objects.create(order=order, item=item, quantity=1, price=10.0, status='ORDERED')
        
        url = reverse('order-send-to-kitchen', args=[order.id])
        response = admin_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        order_item.refresh_from_db()
        
        assert order.status == 'PREPARING'
        assert order_item.status == 'PREPARING'
