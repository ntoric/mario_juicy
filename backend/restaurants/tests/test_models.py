from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from restaurants.models import Table, Order, OrderItem, Reservation
from catalogs.models import Category, Item
from decimal import Decimal

User = get_user_model()

class RestaurantModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='waiter1', password='password')
        self.table = Table.objects.create(number='T1', capacity=4)
        self.category = Category.objects.create(name='Drinks')
        self.item = Item.objects.create(
            category=self.category,
            name='Cola',
            price=Decimal('50.00'),
            is_enabled=True
        )

    def test_table_creation(self):
        self.assertEqual(str(self.table), 'Table T1')
        self.assertEqual(self.table.status, 'VACANT')

    def test_order_creation(self):
        order = Order.objects.create(table=self.table, waiter=self.user)
        self.assertEqual(order.total_amount, Decimal('0.00'))
        self.assertEqual(order.status, 'ORDER_TAKEN')

    def test_order_total_calculation(self):
        order = Order.objects.create(table=self.table, waiter=self.user)
        OrderItem.objects.create(
            order=order,
            item=self.item,
            quantity=2,
            price=self.item.price
        )
        order.update_total_amount()
        self.assertEqual(order.total_amount, Decimal('100.00'))

    def test_reservation_creation(self):
        reservation_time = timezone.now() + timezone.timedelta(days=1)
        reservation = Reservation.objects.create(
            table=self.table,
            customer_name='John Doe',
            customer_phone='1234567890',
            reservation_time=reservation_time,
            number_of_guests=2
        )
        self.assertEqual(reservation.status, 'CONFIRMED')
        self.assertEqual(str(reservation), f"John Doe - {reservation_time} (Table T1)")
