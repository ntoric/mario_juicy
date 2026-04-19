from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from core.models import TaxConfiguration
from catalogs.models import Category, Item
from restaurants.models import Table, Order

User = get_user_model()

class SystemResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create groups
        self.super_admin_group, _ = Group.objects.get_or_create(name='SUPER_ADMIN')
        self.admin_group, _ = Group.objects.get_or_create(name='ADMIN')
        
        # Create users
        self.super_admin = User.objects.create_user(username='superadmin', password='password123')
        self.super_admin.groups.add(self.super_admin_group)
        
        self.regular_admin = User.objects.create_user(username='regularadmin', password='password123')
        self.regular_admin.groups.add(self.admin_group)
        
        # Create data to reset
        self.category = Category.objects.create(name='Fast Food')
        self.item = Item.objects.create(name='Burger', category=self.category, price=100)
        self.table = Table.objects.create(number='101')
        self.order = Order.objects.create(table=self.table, status='ORDER_TAKEN')
        
        # URL
        self.url = reverse('system-reset')

    def test_reset_unauthenticated(self):
        response = self.client.post(self.url, {'target': 'all'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reset_non_superadmin(self):
        self.client.force_authenticate(user=self.regular_admin)
        response = self.client.post(self.url, {'target': 'all'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reset_orders_only(self):
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.post(self.url, {'target': 'orders'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Orders should be gone
        self.assertEqual(Order.objects.count(), 0)
        # Catalog should remain
        self.assertEqual(Item.objects.count(), 1)
        self.assertEqual(Category.objects.count(), 1)

    def test_reset_catalog_only(self):
        self.client.force_authenticate(user=self.super_admin)
        # We need to delete orders first because items are linked to OrderItems (on_delete=models.PROTECT)
        self.order.delete() 
        
        response = self.client.post(self.url, {'target': 'catalog'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Catalog should be gone
        self.assertEqual(Item.objects.count(), 0)
        self.assertEqual(Category.objects.count(), 0)
        # Table should remain
        self.assertEqual(Table.objects.count(), 1)

    def test_reset_all(self):
        self.client.force_authenticate(user=self.super_admin)
        response = self.client.post(self.url, {'target': 'all'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(Item.objects.count(), 0)
        self.assertEqual(Category.objects.count(), 0)
        self.assertEqual(Table.objects.count(), 0)
        # Only superadmin should remain (and any other superusers if existed)
        self.assertEqual(User.objects.count(), 1) 
        self.assertEqual(User.objects.first(), self.super_admin)
