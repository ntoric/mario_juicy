from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import Group, Permission
from users.models import User
from restaurants.models import Table, Order
from stores.models import Store

class OrderDeletionTests(APITestCase):
    def setUp(self):
        self.store = Store.objects.create(name="Test Store")
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
        # Table should be occupied now
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'OCCUPIED')
        
        self.client.force_authenticate(user=self.admin_user)

    def test_delete_order_frees_table(self):
        url = reverse('order-detail', kwargs={'pk': self.order.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify order is gone
        self.assertFalse(Order.objects.filter(pk=self.order.pk).exists())
        
        # Check table status
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'VACANT')
        
    def test_delete_order_keeps_table_if_other_active(self):
        # Add another active order
        order2 = Order.objects.create(
            table=self.table,
            store=self.store,
            status='PREPARING',
            order_type='DINE_IN'
        )
        
        url = reverse('order-detail', kwargs={'pk': self.order.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Table should still be OCCUPIED because order2 is active
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'OCCUPIED')
        
        # Now delete order2
        url2 = reverse('order-detail', kwargs={'pk': order2.pk})
        self.client.delete(url2)
        
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'VACANT')
