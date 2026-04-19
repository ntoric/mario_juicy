from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from restaurants.models import Order, Invoice
from catalogs.models import Item, Category
from stores.models import Store
from django.contrib.auth import get_user_model

User = get_user_model()

class ParcelFlowTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        # Create a store with ID 1 to match StoreFilterMixin's default for admins
        self.store, _ = Store.objects.get_or_create(id=1, defaults={'name': "Main Branch"})
        
        # Create superuser to bypass all permission checks
        self.user = User.objects.create_superuser(username="admin", password="password", email="admin@example.com")
        self.user.store = self.store
        self.user.save()
        
        self.category = Category.objects.create(name="Food", store=self.store)
        self.item = Item.objects.create(name="Burger", price=100.00, category=self.category, store=self.store)
        self.api_client.force_authenticate(user=self.user)
        
        # Set X-Store-ID header
        self.api_client.credentials(HTTP_X_STORE_ID=str(self.store.id))

    def test_parcel_flow(self):
        # 1. Create Parcel Order
        url = "/api/restaurants/orders/"
        data = {
            'order_type': 'TAKE_AWAY',
            'customer_name': 'John Doe',
            'customer_mobile': '9876543210'
        }
        response = self.api_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        order_guid = response.data['id']
        
        # 2. Add Item
        url = f"/api/restaurants/orders/{order_guid}/add_item/"
        data = {'item': self.item.id, 'quantity': 2}
        response = self.api_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        
        # 3. Generate Bill Early (mark_as_paid=False)
        url = f"/api/restaurants/orders/{order_guid}/checkout/"
        data = {'payment_method': 'CASH', 'mark_as_paid': False}
        response = self.api_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(Invoice.objects.filter(order_id=order_guid).exists())
        
        order = Order.objects.get(id=order_guid)
        self.assertNotEqual(order.status, 'PAID')
        
        # 4. Finalize Payment
        # Re-check URL
        data = {'payment_method': 'UPI', 'mark_as_paid': True}
        response = self.api_client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        order.refresh_from_db()
        self.assertEqual(order.status, 'PAID')
        self.assertEqual(order.invoice.payment_method, 'UPI')


    def test_parcel_return(self):
        # Create Order
        order = Order.objects.create(
            order_type='TAKE_AWAY', 
            store=self.store,
            customer_name='Jane Doe',
            status='READY'
        )
        
        # Return Order
        url = f"/api/restaurants/orders/{order.id}/return_order/"
        response = self.api_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        order.refresh_from_db()
        self.assertEqual(order.status, 'RETURNED')
