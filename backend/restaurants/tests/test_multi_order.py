from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from restaurants.models import Table, Order
from stores.models import Store

User = get_user_model()

class MultiOrderTest(APITestCase):
    def setUp(self):
        self.store = Store.objects.create(name='Test Store', id=1)
        self.user = User.objects.create_user(username='admin', password='password', is_superuser=True, is_staff=True)
        self.client.force_authenticate(user=self.user)
        self.table1 = Table.objects.create(number='T1', capacity=4, store=self.store, status='VACANT')

    def test_multiple_orders_on_one_table(self):
        """Test that we can have multiple active orders on one table."""
        # Create first order
        order1 = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        self.table1.refresh_from_db()
        self.assertEqual(self.table1.status, 'OCCUPIED')
        
        # Create second order on same table
        order2 = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        self.table1.refresh_from_db()
        self.assertEqual(self.table1.status, 'OCCUPIED')
        
        # Verify both orders exist for the table
        self.assertEqual(Order.objects.filter(table=self.table1).count(), 2)

    def test_table_release_logic(self):
        """Test that table only becomes VACANT when ALL active orders are terminal."""
        order1 = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        order2 = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        
        # Close order1
        order1.status = 'PAID'
        order1.save()
        
        # Table should STILL be occupied because order2 is active
        self.table1.refresh_from_db()
        self.assertEqual(self.table1.status, 'OCCUPIED')
        
        # Close order2
        order2.status = 'PAID'
        order2.save()
        
        # Table should now be VACANT
        self.table1.refresh_from_db()
        self.assertEqual(self.table1.status, 'VACANT')

    def test_table_serializer_active_orders(self):
        """Test that TableSerializer returns all active orders."""
        order1 = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        order2 = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        
        url = reverse('table-detail', args=[self.table1.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check active_orders list
        active_orders = response.data.get('active_orders', [])
        self.assertEqual(len(active_orders), 2)
        
        order_ids = [o['id'] for o in active_orders]
        self.assertIn(order1.id, order_ids)
        self.assertIn(order2.id, order_ids)
