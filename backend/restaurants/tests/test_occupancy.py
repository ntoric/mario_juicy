from django.test import TestCase
from django.contrib.auth import get_user_model
from restaurants.models import Table, Order
from stores.models import Store

User = get_user_model()

class OccupancyTestCase(TestCase):
    def setUp(self):
        self.store, _ = Store.objects.get_or_create(id=1, defaults={'name': "Test Store"})
        self.table = Table.objects.create(number="OCC-1", capacity=4, store=self.store)
        self.user = User.objects.create_user(username="occ_waiter", password="password", store=self.store)
        
        # Grant take order permission
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        permission = Permission.objects.get(codename='access_to_take_order')
        self.user.user_permissions.add(permission)
        self.user = User.objects.get(pk=self.user.pk) # Refresh permissions

    def test_single_order_partial_occupancy(self):
        """Table should be PARTIALLY_OCCUPIED if single order doesn't fill capacity."""
        order = Order.objects.create(
            table=self.table,
            store=self.store,
            waiter=self.user,
            number_of_persons=2,
            order_type='DINE_IN'
        )
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'PARTIALLY_OCCUPIED')

    def test_multiple_orders_full_occupancy(self):
        """Table should be OCCUPIED if multiple orders fill capacity."""
        Order.objects.create(
            table=self.table,
            store=self.store,
            waiter=self.user,
            number_of_persons=2,
            order_type='DINE_IN'
        )
        Order.objects.create(
            table=self.table,
            store=self.store,
            waiter=self.user,
            number_of_persons=2,
            order_type='DINE_IN'
        )
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'OCCUPIED')

    def test_over_capacity_with_buffer_failure(self):
        """Order should fail if it exceeds capacity + 2."""
        # Table capacity is 4. Max allowed is 4+2=6.
        # Try to create an order for 7 persons.
        from rest_framework.exceptions import ValidationError
        
        # Test creation via views (if possible) or just check model logic if enforced there.
        # Since I enforced it in views.perform_create, I should use APIClient.
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        url = "/api/restaurants/orders/"
        response = client.post(url, {
            'table': self.table.id,
            'number_of_persons': 7,
            'order_type': 'DINE_IN'
        }, format='json')
        
        self.assertEqual(response.status_code, 400)
        self.assertIn("Maximum table capacity exceeded", str(response.data))

    def test_within_buffer_success(self):
        """Order should succeed if within capacity + 2."""
        # Table capacity is 4. Try 6 persons.
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        url = "/api/restaurants/orders/"
        response = client.post(url, {
            'table': self.table.id,
            'number_of_persons': 6,
            'order_type': 'DINE_IN'
        }, format='json')
        
        self.assertEqual(response.status_code, 201)

    def test_order_completion_releases_seats(self):
        """Table status should update when one of multiple orders is completed."""
        order1 = Order.objects.create(
            table=self.table,
            store=self.store,
            waiter=self.user,
            number_of_persons=2,
            order_type='DINE_IN'
        )
        order2 = Order.objects.create(
            table=self.table,
            store=self.store,
            waiter=self.user,
            number_of_persons=2,
            order_type='DINE_IN'
        )
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'OCCUPIED')

        order1.status = 'PAID'
        order1.save()
        
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'PARTIALLY_OCCUPIED')

        order2.status = 'PAID'
        order2.save()
        
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'VACANT')

    def test_move_order_with_person_update(self):
        """Test moving order to another table while changing person count."""
        table2 = Table.objects.create(number="OCC-2", capacity=2, store=self.store)
        order = Order.objects.create(
            table=self.table,
            store=self.store,
            waiter=self.user,
            number_of_persons=4,
            order_type='DINE_IN'
        )
        
        # Initial state: Table 1 (Cap 4, Persons 4) -> OCCUPIED
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'OCCUPIED')
        
        # Move T1 -> T2 and reduce persons 4 -> 2
        from django.urls import reverse
        from rest_framework import status
        from rest_framework.test import APIClient
        
        client = APIClient()
        client.force_authenticate(user=self.user)
        url = reverse('order-change-table', args=[order.id])
        
        response = client.post(url, {
            'target_table_id': table2.id,
            'number_of_persons': 2
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        order.refresh_from_db()
        self.assertEqual(order.table, table2)
        self.assertEqual(order.number_of_persons, 2)
        
        # Verify T1 is vacant
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'VACANT')
        
        # Verify T2 is occupied (since persons 2 == capacity 2)
        table2.refresh_from_db()
        self.assertEqual(table2.status, 'OCCUPIED')
