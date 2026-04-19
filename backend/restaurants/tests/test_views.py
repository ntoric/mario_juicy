from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from restaurants.models import Table, Order, OrderItem
from catalogs.models import Category, Item
from decimal import Decimal

User = get_user_model()


class RestaurantViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='admin', password='password', is_staff=True)
        self.client.force_authenticate(user=self.user)
        self.table = Table.objects.create(number='T1', capacity=4)
        self.category = Category.objects.create(name='Food')
        self.item = Item.objects.create(
            category=self.category,
            name='Burger',
            price=Decimal('150.00'),
            is_enabled=True
        )

    # ── Table ────────────────────────────────────────────────────────────────

    def test_create_table(self):
        url = reverse('table-list')
        data = {'number': 'T2', 'capacity': 2}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Table.objects.count(), 2)

    def test_update_table_position(self):
        url = reverse('table-update-position', args=[self.table.id])
        data = {'pos_x': 45.5, 'pos_y': 30.0, 'shape': 'ROUND'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.table.refresh_from_db()
        self.assertAlmostEqual(self.table.pos_x, 45.5)
        self.assertEqual(self.table.shape, 'ROUND')

    # ── Order ────────────────────────────────────────────────────────────────

    def test_create_order(self):
        url = reverse('order-list')
        data = {'table': self.table.id}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(Order.objects.first().waiter, self.user)

    def test_add_item_to_order(self):
        order = Order.objects.create(table=self.table, waiter=self.user)
        url = reverse('order-add-item', args=[order.id])
        data = {'item': self.item.id, 'quantity': 2, 'notes': 'Extra cheese'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order.refresh_from_db()
        self.assertEqual(OrderItem.objects.count(), 1)
        self.assertEqual(order.total_amount, Decimal('300.00'))

    def test_send_to_kitchen_batch(self):
        """All ORDERED items become PREPARING; order advances to AWAITING."""
        order = Order.objects.create(table=self.table, waiter=self.user)
        OrderItem.objects.create(order=order, item=self.item, quantity=1,
                                 price=self.item.price, status='ORDERED')
        OrderItem.objects.create(order=order, item=self.item, quantity=2,
                                 price=self.item.price, status='ORDERED')

        url = reverse('order-send-to-kitchen', args=[order.id])
        response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated_items'], 2)
        self.assertEqual(response.data['order']['status'], 'AWAITING')
        self.assertTrue(all(
            i.status == 'PREPARING' for i in OrderItem.objects.filter(order=order)
        ))

    # ── Kitchen Display ───────────────────────────────────────────────────────

    def test_kitchen_display_returns_pending_items(self):
        order = Order.objects.create(table=self.table, waiter=self.user)
        OrderItem.objects.create(order=order, item=self.item, quantity=1,
                                 price=self.item.price, status='PREPARING')
        OrderItem.objects.create(order=order, item=self.item, quantity=1,
                                 price=self.item.price, status='SERVED')  # should NOT appear

        url = reverse('kitchen-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'PREPARING')

    # ── Tables page ───────────────────────────────────────────────────────────

    def test_get_tables(self):
        url = reverse('table-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
