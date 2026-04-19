from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from restaurants.models import Table, Order, OrderItem
from catalogs.models import Category, Item
from stores.models import Store
from decimal import Decimal

User = get_user_model()

class OrderItemsTest(APITestCase):
    def setUp(self):
        self.store, _ = Store.objects.get_or_create(
            id=1, 
            defaults={'name': 'Test Store', 'address': 'Test Address'}
        )
        self.user = User.objects.create_user(username='admin', password='password', is_superuser=True)
        self.client.force_authenticate(user=self.user)
        
        # Add X-Store-ID header
        self.client.defaults['HTTP_X_STORE_ID'] = str(self.store.id)
        
        self.table = Table.objects.create(number='T1', capacity=4, store=self.store)
        self.category = Category.objects.create(name='Food', store=self.store)
        self.item = Item.objects.create(
            category=self.category,
            name='Burger',
            price=Decimal('150.00'),
            is_enabled=True,
            store=self.store
        )
        self.order = Order.objects.create(table=self.table, order_type='DINE_IN', store=self.store)

    def test_add_item_to_order_success(self):
        """Test adding an item to an existing order (POST)."""
        url = reverse('order-add-item', args=[self.order.id])
        data = {'item': self.item.id, 'quantity': 2}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OrderItem.objects.count(), 1)
        item = OrderItem.objects.first()
        self.assertEqual(item.item, self.item)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.price, self.item.price)
        
        # Verify order total updated
        self.order.refresh_from_db()
        self.assertEqual(self.order.total_amount, Decimal('300.00'))

    def test_add_item_store_mismatch(self):
        """Test adding an item when X-Store-ID header doesn't match the order's store."""
        other_store = Store.objects.create(name='Other Store')
        self.client.defaults['HTTP_X_STORE_ID'] = str(other_store.id)
        
        url = reverse('order-add-item', args=[self.order.id])
        data = {'item': self.item.id, 'quantity': 1}
        response = self.client.post(url, data, format='json')
        
        # Should return 404 because get_object() filters by store
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
