from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from restaurants.models import Table, Order
from stores.models import Store
from catalogs.models import Category, Item

User = get_user_model()

class TableChangeTest(APITestCase):
    def setUp(self):
        # Create a store
        self.store, _ = Store.objects.get_or_create(id=1, defaults={'name': 'Test Store'})
        
        # Create a user with permissions
        self.user = User.objects.create_user(username='admin', password='password', is_superuser=True, is_staff=True)
        self.client.force_authenticate(user=self.user)
        
        # Create categories and items
        self.category = Category.objects.create(name='Food', store=self.store)
        self.item = Item.objects.create(name='Pizza', price=500, category=self.category, store=self.store)
        
        # Create tables
        self.table1 = Table.objects.create(number='T1', capacity=4, store=self.store, status='VACANT')
        self.table2 = Table.objects.create(number='T2', capacity=4, store=self.store, status='VACANT')
        
    def test_change_table_success(self):
        """Test moving an order from T1 to T2."""
        # Create order on T1
        order = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        self.table1.refresh_from_db()
        self.assertEqual(self.table1.status, 'PARTIALLY_OCCUPIED')
        
        url = reverse('order-change-table', args=[order.id])
        data = {'target_table_id': self.table2.id}
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify order is now on T2
        order.refresh_from_db()
        self.assertEqual(order.table, self.table2)
        
        # Verify T1 is released
        self.table1.refresh_from_db()
        self.assertEqual(self.table1.status, 'VACANT')
        
        # Verify T2 is occupied
        self.table2.refresh_from_db()
        self.assertEqual(self.table2.status, 'PARTIALLY_OCCUPIED')

    def test_change_table_occupied_success(self):
        """Test moving an order to an already occupied table now succeeds."""
        order1 = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        order2 = Order.objects.create(table=self.table2, order_type='DINE_IN', store=self.store)
        
        url = reverse('order-change-table', args=[order1.id])
        data = {'target_table_id': self.table2.id}
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify order1 is now on T2
        order1.refresh_from_db()
        self.assertEqual(order1.table, self.table2)
        
        # Verify both orders are now on T2
        self.assertEqual(Order.objects.filter(table=self.table2).count(), 2)
        
        # Verify T1 is released
        self.table1.refresh_from_db()
        self.assertEqual(self.table1.status, 'VACANT')
        
        # Verify T2 is still occupied
        self.table2.refresh_from_db()
        self.assertEqual(self.table2.status, 'PARTIALLY_OCCUPIED')

    def test_change_table_unauthorized_store(self):
        """Test moving an order to a table in another store fails."""
        store2 = Store.objects.create(name='Other Store', id=2)
        table_other = Table.objects.create(number='X1', capacity=2, store=store2)
        
        order = Order.objects.create(table=self.table1, order_type='DINE_IN', store=self.store)
        
        url = reverse('order-change-table', args=[order.id])
        data = {'target_table_id': table_other.id}
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
