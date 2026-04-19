from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from stores.models import Store
from catalogs.models import Category, Item
from restaurants.models import Table, Order, OrderItem, Invoice
from decimal import Decimal

User = get_user_model()

class InvoicePDFTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.store = Store.objects.create(name="Test Store", address="Test Address")
        self.user = User.objects.create_superuser(username='admin', password='password', is_admin=True)
        self.user.store = self.store
        self.user.save()
        self.client.force_authenticate(user=self.user)
        self.client.defaults['HTTP_X_STORE_ID'] = str(self.store.id)

        self.category = Category.objects.create(name="Test Cat", store=self.store)
        self.item = Item.objects.create(name="Test Item", price=Decimal("100.00"), category=self.category, store=self.store)
        self.table = Table.objects.create(number="1", store=self.store, capacity=4)
        
        self.order = Order.objects.create(table=self.table, store=self.store, order_type='DINE_IN', status='PAID')
        self.order_item = OrderItem.objects.create(order=self.order, item=self.item, quantity=2, price=self.item.price)
        
        self.invoice = Invoice.objects.create(
            invoice_number="INV-20230412-0001",
            store=self.store,
            order=self.order,
            subtotal=Decimal("200.00"),
            tax_amount=Decimal("10.00"),
            tax_details={"GST": "10.00"},
            total_amount=Decimal("210.00"),
            payment_method="CASH",
            waiter=self.user
        )

    def test_invoice_pdf_download(self):
        url = reverse('invoice-download-pdf', kwargs={'pk': self.invoice.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response['Content-Disposition'].startswith('attachment; filename='))
        self.assertTrue(len(response.content) > 0)
