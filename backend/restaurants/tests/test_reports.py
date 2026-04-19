from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from restaurants.models import Order, Invoice, OrderItem, Table
from catalogs.models import Category, Item
from stores.models import Store
from decimal import Decimal
from django.utils import timezone

User = get_user_model()

class ReportViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='admin', password='password', is_staff=True, is_superuser=True)
        self.client.force_authenticate(user=self.user)
        
        # Create store
        self.store = Store.objects.create(name="Test Store")
        
        # Assign store to user if necessary (depending on implementation of StoreFilterMixin)
        self.user.store = self.store
        self.user.save()
        
        self.category = Category.objects.create(name='Food', store=self.store)
        self.item = Item.objects.create(
            category=self.category,
            name='Burger',
            price=Decimal('100.00'),
            store=self.store
        )
        self.table = Table.objects.create(number='T1', store=self.store)

    def test_report_summary(self):
        # Create Order 1
        order1 = Order.objects.create(store=self.store, order_type='DINE_IN', table=self.table)
        OrderItem.objects.create(order=order1, item=self.item, quantity=1, price=Decimal('100.00'))
        order1.update_total_amount()
        
        invoice1 = Invoice.objects.create(
            invoice_number="INV-001", store=self.store, order=order1,
            subtotal=Decimal('100.00'), tax_amount=Decimal('5.00'),
            total_amount=Decimal('105.00'), payment_method='CASH'
        )
        
        # Create Order 2
        order2 = Order.objects.create(store=self.store, order_type='TAKE_AWAY')
        OrderItem.objects.create(order=order2, item=self.item, quantity=2, price=Decimal('100.00'))
        order2.update_total_amount()
        
        invoice2 = Invoice.objects.create(
            invoice_number="INV-002", store=self.store, order=order2,
            subtotal=Decimal('200.00'), tax_amount=Decimal('10.00'),
            total_amount=Decimal('210.00'), payment_method='UPI'
        )

        url = reverse('reports-summary')
        # We need to set X-Store-ID header for admin users
        response = self.client.get(url, HTTP_X_STORE_ID=str(self.store.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_sales'], 315.0)
        self.assertEqual(response.data['total_orders'], 2)
        self.assertEqual(response.data['total_tax'], 15.0)

    def test_sales_by_type(self):
        # Setup similar data
        order1 = Order.objects.create(store=self.store, order_type='DINE_IN', table=self.table)
        OrderItem.objects.create(order=order1, item=self.item, quantity=1, price=Decimal('100.00'))
        Invoice.objects.create(
            invoice_number="INV-T1", store=self.store, order=order1,
            subtotal=Decimal('100.00'), tax_amount=Decimal('0.00'),
            total_amount=Decimal('100.00'), payment_method='CASH'
        )
        
        url = reverse('reports-sales-by-type')
        response = self.client.get(url, HTTP_X_STORE_ID=str(self.store.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['type'] == 'Dine-in' for item in response.data))

    def test_daily_sales(self):
        order1 = Order.objects.create(store=self.store, order_type='DINE_IN', table=self.table)
        Invoice.objects.create(
            invoice_number="INV-D1", store=self.store, order=order1,
            subtotal=Decimal('100.00'), tax_amount=Decimal('0.00'),
            total_amount=Decimal('100.00'), payment_method='CASH'
        )
        
        url = reverse('reports-daily-sales')
        response = self.client.get(url, HTTP_X_STORE_ID=str(self.store.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_sales_by_category(self):
        order1 = Order.objects.create(store=self.store, order_type='DINE_IN', table=self.table)
        OrderItem.objects.create(order=order1, item=self.item, quantity=1, price=Decimal('100.00'))
        Invoice.objects.create(
            invoice_number="INV-C1", store=self.store, order=order1,
            subtotal=Decimal('100.00'), tax_amount=Decimal('0.00'),
            total_amount=Decimal('100.00'), payment_method='CASH'
        )
        
        url = reverse('reports-sales-by-category')
        response = self.client.get(url, HTTP_X_STORE_ID=str(self.store.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['category'], 'Food')
