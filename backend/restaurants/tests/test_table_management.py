import pytest
from django.urls import reverse
from rest_framework import status
from restaurants.models import Table, Order

@pytest.mark.django_db
class TestTableManagement:
    def test_table_status_auto_release(self, admin_client, store):
        # 1. Create a table
        table = Table.objects.create(number="T1", store=store, capacity=4)
        assert table.status == 'VACANT'
        
        # 2. Create an order on the table
        order = Order.objects.create(
            table=table, 
            store=store, 
            order_type='DINE_IN',
            number_of_persons=2,
            status='ORDER_TAKEN'
        )
        table.refresh_from_db()
        assert table.status == 'PARTIALLY_OCCUPIED'
        
        # 3. Mark order as PAID (Terminal status)
        order.status = 'PAID'
        order.save()
        
        table.refresh_from_db()
        assert table.status == 'VACANT'

    def test_table_move_auto_refresh(self, admin_client, store):
        table1 = Table.objects.create(number="T1", store=store, capacity=4)
        table2 = Table.objects.create(number="T2", store=store, capacity=4)
        
        order = Order.objects.create(
            table=table1, 
            store=store, 
            order_type='DINE_IN',
            number_of_persons=2,
            status='ORDER_TAKEN'
        )
        table1.refresh_from_db()
        assert table1.status == 'PARTIALLY_OCCUPIED'
        
        # Move order to table2
        order.table = table2
        order.save()
        
        table1.refresh_from_db()
        table2.refresh_from_db()
        assert table1.status == 'VACANT'
        assert table2.status == 'PARTIALLY_OCCUPIED'

    def test_recalculate_all_endpoint(self, admin_client, store):
        table = Table.objects.create(number="T1", store=store, capacity=4)
        # Manually force a wrong status to simulate "ghost" occupancy
        Table.objects.filter(id=table.id).update(status='OCCUPIED')
        
        url = reverse('table-recalculate-all')
        response = admin_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['updated_tables'] == 1
        
        table.refresh_from_db()
        assert table.status == 'VACANT'
