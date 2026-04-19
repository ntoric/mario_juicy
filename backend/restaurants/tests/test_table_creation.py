from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from restaurants.models import Table

User = get_user_model()

class TableCreationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='admin', password='password')
        # Assign permission to manage table layout
        content_type = ContentType.objects.get_for_model(User) # Permissions are often on User or specific app
        # In this project, it seems HasDiscretePermission uses string like 'users.manage_table_layout_access'
        # Let's ensure the user is super admin to bypass everything for simplicity in verification
        self.user.is_superuser = True
        self.user.is_staff = True
        self.user.save()
        
        self.client.force_authenticate(user=self.user)

    def test_create_table_with_long_number(self):
        """Test creating a table with a number longer than 10 characters (up to 20)."""
        url = reverse('table-list')
        table_number = 'Tab Round 1' # 11 characters
        data = {
            'number': table_number,
            'capacity': 4,
            'shape': 'CIRCLE',
            'status': 'VACANT',
            'pos_x': 10,
            'pos_y': 10
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        table = Table.objects.get(number=table_number)
        self.assertEqual(table.number, table_number)

    def test_edit_table(self):
        """Test editing a table (PATCH) as superuser."""
        table = Table.objects.create(number='T100', capacity=4, store_id=1)
        url = reverse('table-detail', args=[table.id])
        data = {'capacity': 6}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        table.refresh_from_db()
        self.assertEqual(table.capacity, 6)

    def test_edit_table_with_layout_perm(self):
        """Test editing a table (PATCH) with ONLY manage_table_layout_access permission."""
        user = User.objects.create_user(username='manager', password='password')
        # Assign manage_table_layout_access
        perm = Permission.objects.get(codename='manage_table_layout_access')
        user.user_permissions.add(perm)
        user.store_id = 1
        user.save()
        
        self.client.force_authenticate(user=user)
        table = Table.objects.create(number='T300', capacity=4, store_id=1)
        url = reverse('table-detail', args=[table.id])
        data = {'capacity': 8}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_edit_table_with_status_perm(self):
        """Test editing a table (PATCH) with ONLY access_to_update_table_status permission."""
        user = User.objects.create_user(username='waiter', password='password')
        # Assign access_to_update_table_status
        perm = Permission.objects.get(codename='access_to_update_table_status')
        user.user_permissions.add(perm)
        user.store_id = 1
        user.save()
        
        self.client.force_authenticate(user=user)
        table = Table.objects.create(number='T400', capacity=4, store_id=1)
        url = reverse('table-detail', args=[table.id])
        data = {'status': 'OCCUPIED'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_table(self):
        """Test deleting a table (DELETE)."""
        table = Table.objects.create(number='T200', capacity=4, store_id=1)
        url = reverse('table-detail', args=[table.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Table.objects.filter(id=table.id).exists())

    def test_create_table_validation_error_reporting(self):
        """Test that validation errors are returned for number > 20 characters."""
        url = reverse('table-list')
        table_number = 'A' * 21 # 21 characters
        data = {
            'number': table_number,
            'capacity': 4
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Verify it returns field-specific error
        self.assertIn('number', response.data)
        self.assertEqual(response.data['number'][0].code, 'max_length')
