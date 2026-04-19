from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import Group, Permission
from users.models import User

class UserManagementTests(APITestCase):
    def setUp(self):
        from stores.models import Store
        Store.objects.all().delete()
        self.store = Store.objects.create(name="Test Store", address="Test Address")
        
        # Create groups and permissions
        self.admin_group, _ = Group.objects.get_or_create(name='ADMIN')
        self.manager_group, _ = Group.objects.get_or_create(name='MANAGER')
        self.cashier_group, _ = Group.objects.get_or_create(name='CASHIER')
        
        # Add manage permission to can_add_users
        can_add_users_perm = Permission.objects.get(codename='can_add_users')
        self.admin_group.permissions.add(can_add_users_perm)
        
        # Create users
        self.admin_user = User.objects.create_user(username='admin', password='adminpassword', store=self.store)
        self.admin_user.groups.add(self.admin_group)
        
        self.manager_user = User.objects.create_user(username='manager', password='managerpassword', store=self.store)
        self.manager_user.groups.add(self.manager_group)
        
        self.cashier_user = User.objects.create_user(username='cashier', password='cashierpassword', store=self.store)
        self.cashier_user.groups.add(self.cashier_group)
        
        self.user_list_url = reverse('user-management-list')

    def test_admin_can_list_users(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.user_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see 3 users
        self.assertEqual(len(response.data), 3)

    def test_cashier_cannot_list_users(self):
        self.client.force_authenticate(user=self.cashier_user)
        response = self.client.get(self.user_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_user(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "username": "newuser",
            "password": "newpassword123",
            "role": "CASHIER",
            "is_active": True
        }
        response = self.client.post(self.user_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(username="newuser").count(), 1)
        
        new_user = User.objects.get(username="newuser")
        self.assertTrue(new_user.groups.filter(name="CASHIER").exists())

    def test_admin_can_disable_user(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-management-detail', args=[self.cashier_user.id])
        data = {"is_active": False}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.cashier_user.refresh_from_db()
        self.assertFalse(self.cashier_user.is_active)

    def test_admin_can_change_user_key(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-management-detail', args=[self.cashier_user.id])
        data = {"password": "changedkey123"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.cashier_user.refresh_from_db()
        self.assertTrue(self.cashier_user.check_password("changedkey123"))

    def test_admin_can_delete_user(self):
        self.client.force_authenticate(user=self.admin_user)
        user_to_delete = User.objects.create_user(username='temporary', password='password', store=self.store)
        url = reverse('user-management-detail', args=[user_to_delete.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(User.objects.filter(username='temporary').count(), 0)

    def test_admin_can_create_manager(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "username": "newmanager",
            "password": "managerpassword123",
            "role": "MANAGER",
            "is_active": True
        }
        response = self.client.post(self.user_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newmanager").exists())
        
    def test_admin_cannot_create_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "username": "newadmin",
            "password": "adminpassword123",
            "role": "ADMIN",
            "is_active": True
        }
        response = self.client.post(self.user_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Only Super Admins can create Administrators", str(response.data.get('detail', '')))

    def test_manager_cannot_create_manager(self):
        self.client.force_authenticate(user=self.manager_user)
        data = {
            "username": "newmanager2",
            "password": "managerpassword123",
            "role": "MANAGER",
            "is_active": True
        }
        response = self.client.post(self.user_list_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Managers can only create Cashiers or Staff", str(response.data.get('detail', '')))
