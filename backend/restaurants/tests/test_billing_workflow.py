import pytest
from django.urls import reverse
from rest_framework import status
from restaurants.models import Order, Invoice, Table
from catalogs.models import Item
from core.models import TaxConfiguration
from decimal import Decimal

@pytest.mark.django_db
class TestBillingWorkflow:
    @pytest.fixture
    def setup_data(self, admin_client, store_factory, item_factory, table_factory):
        self.client = admin_client
        self.store = store_factory.create(name="Billing Store")
        self.item = item_factory.create(name="Samosa", price=Decimal("20.00"), store=self.store)
        self.table = table_factory.create(number="B1", store=self.store)
        
        # Configure taxes: 5% GST (2.5% CGST, 2.5% SGST) + 1% CESS
        self.tax_config = TaxConfiguration.get_for_store(self.store)
        self.tax_config.is_active = True
        self.tax_config.tax_type = 'EXCLUSIVE'
        self.tax_config.is_gst_enabled = True
        self.tax_config.cgst_rate = Decimal("2.5")
        self.tax_config.sgst_rate = Decimal("2.5")
        self.tax_config.is_cess_enabled = True
        self.tax_config.cess_rate = Decimal("1.0")
        self.tax_config.save()
        
    def test_complete_billing_workflow(self, setup_data):
        # 1. Create an order
        order = Order.objects.create(
            table=self.table,
            store=self.store,
            order_type='DINE_IN',
            status='SERVED'
        )
        # Add items
        from restaurants.models import OrderItem
        OrderItem.objects.create(order=order, item=self.item, quantity=2, price=self.item.price)
        order.update_total_amount()
        
        # 2. Mark as COMPLETED (Table should be released)
        order.status = 'COMPLETED'
        order.save()
        self.table.refresh_from_db()
        assert self.table.status == 'VACANT'
        
        # 3. Generate Bill (Invoice) without paying
        checkout_url = reverse('order-checkout', args=[order.id])
        payload = {
            'payment_method': 'UPI',
            'mark_as_paid': False
        }
        # Set X-Store-ID header for admin client if needed
        headers = {'HTTP_X_STORE_ID': str(self.store.id)}
        response = self.client.post(checkout_url, payload, **headers)
        
        assert response.status_code == status.HTTP_201_CREATED
        invoice_data = response.data
        assert invoice_data['subtotal'] == '40.00'
        # Tax = (2.5% CGST + 2.5% SGST) of 40 = 2.00
        # + 1% CESS of 40 = 0.40
        # Total Tax = 2.40
        assert Decimal(invoice_data['tax_amount']) == Decimal("2.40")
        assert Decimal(invoice_data['total_amount']) == Decimal("42.40")
        assert invoice_data['tax_details']['CGST'] == '1.00'
        assert invoice_data['tax_details']['SGST'] == '1.00'
        assert invoice_data['tax_details']['CESS'] == '0.40'
        
        # Order should still be COMPLETED
        order.refresh_from_db()
        assert order.status == 'COMPLETED'
        
        # 4. Mark as PAID
        payload = {
            'payment_method': 'UPI',
            'mark_as_paid': True
        }
        response = self.client.post(checkout_url, payload, **headers)
        assert response.status_code == status.HTTP_200_OK
        
        order.refresh_from_db()
        assert order.status == 'PAID'
        assert order.invoice.payment_method == 'UPI'
