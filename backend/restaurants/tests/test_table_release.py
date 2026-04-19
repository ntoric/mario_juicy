from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import Group, Permission
from users.models import User
from restaurants.models import Table, Order
from stores.models import Store

class TableReleaseTests(APITestCase):
    def setUp(self):
        self.store, _ = Store.objects.get_or_create(id=1, defaults={'name': "Test Store"})
        self.admin_user = User.objects.create_superuser(
            username='admin', email='admin@test.com', password='password123'
        )
        self.table = Table.objects.create(number="1", store=self.store, status='VACANT')
        
        # Create an active order
        self.order = Order.objects.create(
            table=self.table,
            store=self.store,
            status='ORDER_TAKEN',
            order_type='DINE_IN'
        )
        # Table should be partially occupied now due to Order.save() logic
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'PARTIALLY_OCCUPIED')
        
        self.client.force_authenticate(user=self.admin_user)

    def test_release_table_cancels_orders(self):
        url = reverse('table-release', kwargs={'pk': self.table.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check order status
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'CANCELLED')
        self.assertIn("Table force released", self.order.notes)
        
        # Check table status
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'VACANT')
        
    def test_release_table_multiple_orders(self):
        # Add another order
        order2 = Order.objects.create(
            table=self.table,
            store=self.store,
            status='PREPARING',
            order_type='DINE_IN'
        )
        
        url = reverse('table-release', kwargs={'pk': self.table.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['cancelled_count'], 2)
        
        order2.refresh_from_db()
        self.assertEqual(order2.status, 'CANCELLED')
        
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'VACANT')

    def test_release_table_ignores_terminal_orders(self):
        # Create a paid order
        paid_order = Order.objects.create(
            table=self.table,
            store=self.store,
            status='PAID',
            order_type='DINE_IN'
        )
        
        url = reverse('table-release', kwargs={'pk': self.table.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        paid_order.refresh_from_db()
        self.assertEqual(paid_order.status, 'PAID') # Should NOT be cancelled
        
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'VACANT')
