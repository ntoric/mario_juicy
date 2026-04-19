from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from catalogs.models import Item, Category

User = get_user_model()

class ItemViewSetTest(APITestCase):
    def setUp(self):
        # Create roles (matching CategoryViewSetTest)
        self.admin_group, _ = Group.objects.get_or_create(name='ADMIN')
        self.manager_group, _ = Group.objects.get_or_create(name='MANAGER')
        self.cashier_group, _ = Group.objects.get_or_create(name='CASHIER')

        # Create users
        self.admin_user = User.objects.create_user(username='admin_item_test', password='password')
        self.admin_user.groups.add(self.admin_group)

        self.manager_user = User.objects.create_user(username='manager_item_test', password='password')
        self.manager_user.groups.add(self.manager_group)

        self.cashier_user = User.objects.create_user(username='cashier_item_test', password='password')
        self.cashier_user.groups.add(self.cashier_group)

        # Create a sample category
        self.category = Category.objects.create(name="Beverages")

        # Create a sample item
        self.item = Item.objects.create(
            name="Espresso Shot",
            code="ESP001",
            description="Strong and bold",
            price=2.50,
            category=self.category,
            is_enabled=True
        )
        self.list_url = reverse('item-list')
        self.detail_url = reverse('item-detail', kwargs={'pk': self.item.pk})
        self.toggle_url = reverse('item-toggle-status', kwargs={'pk': self.item.pk})

    def test_list_items_as_manager(self):
        self.client.force_authenticate(user=self.manager_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['category_name'], "Beverages")
        self.assertEqual(float(response.data[0]['price']), 2.50)

    def test_create_item_as_manager(self):
        self.client.force_authenticate(user=self.manager_user)
        data = {
            'name': 'Latte',
            'code': 'LAT001',
            'description': 'Creamy and smooth',
            'price': 3.75,
            'category': self.category.id
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Item.objects.count(), 2)
        new_item = Item.objects.get(name='Latte')
        self.assertEqual(new_item.price, 3.75)
        self.assertEqual(new_item.category, self.category)

    def test_create_item_as_cashier_fails(self):
        self.client.force_authenticate(user=self.cashier_user)
        data = {'name': 'Forbidden Item'}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_toggle_status_action(self):
        self.client.force_authenticate(user=self.manager_user)
        # Toggle from True to False
        response = self.client.post(self.toggle_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertFalse(self.item.is_enabled)
        self.assertEqual(response.data['is_enabled'], False)

        # Toggle back to True
        response = self.client.post(self.toggle_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertTrue(self.item.is_enabled)
        self.assertEqual(response.data['is_enabled'], True)

    def test_delete_item_as_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Item.objects.count(), 0)

    def test_edit_item_as_manager(self):
        self.client.force_authenticate(user=self.manager_user)
        data = {'name': 'Updated Espresso', 'code': 'ESP001-NEW'}
        response = self.client.patch(self.detail_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.name, 'Updated Espresso')
        self.assertEqual(self.item.code, 'ESP001-NEW')
