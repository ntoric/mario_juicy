from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    store = models.ForeignKey('stores.Store', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    
    class Meta:
        permissions = [
            ("can_add_users", "Can add new users to the system"),
            ("manage_table_layout_access", "Can manage table layout"),
            ("view_table_layout_access", "Can view table layout"),
            ("access_to_update_table_status", "Can update table status"),
            ("access_to_take_order", "Can take restaurant orders"),
            ("access_to_view_kitchen_display", "Can view kitchen display"),
            ("access_to_manage_kitchen_queue", "Can manage kitchen queue"),
            ("access_to_payment_management", "Can manage payment and billing"),
            ("access_to_delete_order", "Can delete orders"),
            ("view_reports", "Can view analytics and reports"),
            ("access_to_dashboard", "Can view dashboard"),
        ]

    def is_in_group(self, group_name):
        return self.groups.filter(name=group_name.upper()).exists()

    @property
    def is_super_admin(self):
        return self.is_in_group('SUPER_ADMIN') or self.is_superuser

    @property
    def is_admin(self):
        return self.is_in_group('ADMIN') or self.is_super_admin

    @property
    def is_manager(self):
        return self.is_in_group('MANAGER') or self.is_admin

    @property
    def is_cashier(self):
        return self.is_in_group('CASHIER') or self.is_manager

    @property
    def is_staff_member(self):
        return self.is_in_group('STAFF') or self.is_cashier

    def __str__(self):
        return f"{self.username}"

MENU_PERMISSIONS = {
    'dashboard': ['users.access_to_dashboard'],
    'table_map': ['users.view_table_layout_access'],
    'take_order': ['users.access_to_take_order'],
    'update_table_status': ['users.access_to_update_table_status'],
    'manage_tables': ['users.manage_table_layout_access'],
    'parcel': ['restaurants.view_order'],
    'reservations': ['restaurants.view_reservation'],
    'live_orders': ['restaurants.view_order'],
    'kitchen_display': ['users.access_to_view_kitchen_display'],
    'manage_kitchen': ['users.access_to_manage_kitchen_queue'],
    'billing': ['restaurants.view_invoice'],
    'payment_management': ['users.access_to_payment_management'],
    'categories': ['catalogs.view_category'],
    'items': ['catalogs.view_item'],
    'reports': ['users.view_reports'],
    'stores': ['stores.view_store'],
    'users': ['users.view_user'],
    'manage_users': ['users.can_add_users'],
    'delete_order': ['users.access_to_delete_order'],
    'settings': ['core.view_taxconfiguration'],
}
