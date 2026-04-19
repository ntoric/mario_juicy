from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from catalogs.models import Category

User = get_user_model()

class CategoryViewSetTest(APITestCase):
    def setUp(self):
        # Create roles
        self.admin_group = Group.objects.create(name='ADMIN')
        self.manager_group = Group.objects.create(name='MANAGER')
        self.cashier_group = Group.objects.create(name='CASHIER')

        # Create users
        self.admin_user = User.objects.create_user(username='admin', password='password')
        self.admin_user.groups.add(self.admin_group)

        self.manager_user = User.objects.create_user(username='manager', password='password')
        self.manager_user.groups.add(self.manager_group)

        self.cashier_user = User.objects.create_user(username='cashier', password='password')
        self.cashier_user.groups.add(self.cashier_group)

        # Create a sample category
        self.category = Category.objects.create(name="Furniture", is_enabled=True)
        self.list_url = reverse('category-list')
        self.detail_url = reverse('category-detail', kwargs={'pk': self.category.pk})
        self.toggle_url = reverse('category-toggle-status', kwargs={'pk': self.category.pk})

    def test_list_categories_as_manager(self):
        """Test listing categories as a manager."""
        self.client.force_authenticate(user=self.manager_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_category_as_manager(self):
        """Test creating a category as a manager."""
        self.client.force_authenticate(user=self.manager_user)
        data = {'name': 'Decor'}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Category.objects.count(), 2)

    def test_create_category_as_cashier_fails(self):
        """Test that a cashier cannot create a category."""
        self.client.force_authenticate(user=self.cashier_user)
        data = {'name': 'Forbidden'}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_toggle_status_action(self):
        """Test the custom toggle_status action."""
        self.client.force_authenticate(user=self.manager_user)
        # Toggle from True to False
        response = self.client.post(self.toggle_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertFalse(self.category.is_enabled)
        self.assertEqual(response.data['is_enabled'], False)

        # Toggle back to True
        response = self.client.post(self.toggle_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertTrue(self.category.is_enabled)
        self.assertEqual(response.data['is_enabled'], True)

    def test_delete_category_as_admin(self):
        """Test deleting a category as an admin."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Category.objects.count(), 0)
