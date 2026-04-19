from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from stores.models import Store
from restaurants.models import Order, Invoice, Table, OrderItem
from catalogs.models import Item, Category
from django.contrib.auth import get_user_model

from django.test import override_settings

User = get_user_model()

@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class DashboardTests(APITestCase):
    def setUp(self):
        self.store = Store.objects.create(name="Test Store")
        self.user = User.objects.create_user(
            username="testuser", 
            password="password", 
            store=self.store
        )
        self.category = Category.objects.create(name="Food", store=self.store)
        self.item = Item.objects.create(name="Burger", price=100.00, store=self.store, category=self.category)
        self.table = Table.objects.create(number="1", store=self.store, status="OCCUPIED")

    def test_dashboard_stats(self):
        self.client.force_authenticate(user=self.user)
        
        # Create an order and invoice for today
        order = Order.objects.create(store=self.store, order_type="DINE_IN", table=self.table)
        OrderItem.objects.create(order=order, item=self.item, quantity=2, price=100.00)
        order.update_total_amount()
        
        invoice = Invoice.objects.create(
            invoice_number="INV-001",
            store=self.store,
            order=order,
            subtotal=200.00,
            total_amount=200.00
        )
        
        url = reverse('dashboard-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify stats
        stats = {s['label']: s['value'] for s in data['stats']}
        self.assertEqual(stats["Today's Sales"], "₹200.00")
        self.assertEqual(stats["Transactions"], "1")
        self.assertEqual(stats["Avg. Ticket"], "₹200.00")
        self.assertEqual(stats["Table Occupancy"], "100.0%")
        
        # Verify recent transactions
        self.assertEqual(len(data['recent_transactions']), 1)
        self.assertEqual(data['recent_transactions'][0]['id'], "INV-001")
        
        # Verify popular items
        self.assertEqual(len(data['popular_items']), 1)
        self.assertEqual(data['popular_items'][0]['name'], "Burger")
        self.assertEqual(data['popular_items'][0]['sales'], 2)
