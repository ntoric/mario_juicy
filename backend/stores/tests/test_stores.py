from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIClient
from rest_framework import status
from stores.models import Store

User = get_user_model()

class StoreFeatureToggleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Store.objects.all().delete()
        self.store = Store.objects.create(
            name="Test Store",
            address="Test Address",
            invoice_prefix="TST"
        )
        
        # Create Super Admin
        self.super_admin = User.objects.create_superuser(
            username="superadmin",
            password="password123",
            email="super@admin.com"
        )
        super_admin_group, _ = Group.objects.get_or_create(name='SUPER_ADMIN')
        self.super_admin.groups.add(super_admin_group)
        
        # Create Regular Admin
        self.admin_user = User.objects.create_user(
            username="adminuser",
            password="password123",
            email="admin@user.com",
            store=self.store
        )
        admin_group, _ = Group.objects.get_or_create(name='ADMIN')
        self.admin_user.groups.add(admin_group)

    def test_super_admin_can_toggle_reservations(self):
        self.client.force_authenticate(user=self.super_admin)
        url = f'/api/stores/{self.store.id}/'
        
        # Disable reservations
        response = self.client.patch(url, {'is_reservations_enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertFalse(self.store.is_reservations_enabled)
        
        # Enable reservations
        response = self.client.patch(url, {'is_reservations_enabled': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertTrue(self.store.is_reservations_enabled)

    def test_regular_admin_cannot_toggle_reservations(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f'/api/stores/{self.store.id}/'
        
        # Try to disable reservations
        response = self.client.patch(url, {'is_reservations_enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.store.refresh_from_db()
        self.assertTrue(self.store.is_reservations_enabled)

    def test_super_admin_can_toggle_other_features(self):
        self.client.force_authenticate(user=self.super_admin)
        url = f'/api/stores/{self.store.id}/'
        
        # Toggle Take Away
        response = self.client.patch(url, {'is_take_away_enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertFalse(self.store.is_take_away_enabled)

        # Toggle Kitchen Step
        response = self.client.patch(url, {'is_kitchen_step_enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertFalse(self.store.is_kitchen_step_enabled)

    def test_regular_admin_cannot_toggle_other_features(self):
        self.client.force_authenticate(user=self.admin_user)
        url = f'/api/stores/{self.store.id}/'
        
        # Try to toggle Take Away
        response = self.client.patch(url, {'is_take_away_enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try to toggle Kitchen Step
        response = self.client.patch(url, {'is_kitchen_step_enabled': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
