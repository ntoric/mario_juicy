from django.test import TestCase
from stores.models import Store
from restaurants.models import Order, Invoice
from restaurants.serializers import InvoiceSerializer
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

User = get_user_model()

class StoreFieldTests(TestCase):
    def setUp(self):
        self.store = Store.objects.create(
            name="Test Store",
            address="Test Address",
            location="Test Location",
            fssai_lic_no="1234567890",
            mobile="9876543210",
            invoice_prefix="TST"
        )
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.order = Order.objects.create(
            store=self.store,
            order_type='TAKE_AWAY',
            total_amount=100.00
        )
        self.invoice = Invoice.objects.create(
            invoice_number="INV-2026-0001",
            store=self.store,
            order=self.order,
            subtotal=100.00,
            total_amount=118.00,
            tax_amount=18.00,
            tax_details={"GST": "18.00"},
            waiter=self.user
        )

    def test_store_fields_save_correctly(self):
        store = Store.objects.get(id=self.store.id)
        self.assertEqual(store.location, "Test Location")
        self.assertEqual(store.fssai_lic_no, "1234567890")
        self.assertEqual(store.mobile, "9876543210")

    def test_invoice_serializer_includes_new_fields(self):
        serializer = InvoiceSerializer(self.invoice)
        store_details = serializer.data.get('store_details')
        self.assertEqual(store_details.get('location'), "Test Location")
        self.assertEqual(store_details.get('fssai_lic_no'), "1234567890")
        self.assertEqual(store_details.get('mobile'), "9876543210")
