from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from users.models import User

class Command(BaseCommand):
    help = 'Initializes roles (groups) and permissions for the POS application'

    def handle(self, *args, **options):
        # 1. Create Groups
        roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'STAFF']
        groups = {}
        for role in roles:
            group, created = Group.objects.get_or_create(name=role)
            groups[role] = group
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created group: {role}'))

        # 2. Get Content Types
        user_ct = ContentType.objects.get_for_model(User)
        
        # We need to import models here or use strings if they are from other apps
        from catalogs.models import Category, Item
        from restaurants.models import Table
        
        category_ct = ContentType.objects.get_for_model(Category)
        item_ct = ContentType.objects.get_for_model(Item)
        table_ct = ContentType.objects.get_for_model(Table)

        # 3. Setup Custom Permissions
        manage_table_perm, _ = Permission.objects.get_or_create(
            codename='manage_table_layout_access',
            content_type=user_ct,
            defaults={'name': 'Can manage table layout'}
        )
        view_table_perm, _ = Permission.objects.get_or_create(
            codename='view_table_layout_access',
            content_type=user_ct,
            defaults={'name': 'Can view table layout'}
        )
        can_add_users_perm, _ = Permission.objects.get_or_create(
            codename='can_add_users',
            content_type=user_ct,
            defaults={'name': 'Can add new users to the system'}
        )
        
        # New Restaurant Flow Permissions (defined in User Meta)
        update_table_status_perm = Permission.objects.get(codename='access_to_update_table_status', content_type=user_ct)
        take_order_perm = Permission.objects.get(codename='access_to_take_order', content_type=user_ct)
        view_kds_perm = Permission.objects.get(codename='access_to_view_kitchen_display', content_type=user_ct)
        manage_kds_perm = Permission.objects.get(codename='access_to_manage_kitchen_queue', content_type=user_ct)
        payment_perm = Permission.objects.get(codename='access_to_payment_management', content_type=user_ct)

        # 4. Standard Permissions
        def get_perms(model_ct):
            return Permission.objects.filter(content_type=model_ct)

        cat_perms = get_perms(category_ct)
        item_perms = get_perms(item_ct)
        user_perms = get_perms(user_ct)
        
        # 5. Assign Permissions to Groups
        groups['SUPER_ADMIN'].permissions.set(Permission.objects.all())

        # ADMIN gets everything
        admin_perms = list(cat_perms) + list(item_perms) + list(user_perms) + [
            manage_table_perm, view_table_perm, 
            update_table_status_perm, take_order_perm, view_kds_perm, manage_kds_perm, payment_perm
        ]
        groups['ADMIN'].permissions.set(admin_perms)

        # MANAGER gets catalog, items, view tables, and can add users + restaurant ops
        manager_perms = list(cat_perms) + list(item_perms) + [
            view_table_perm, can_add_users_perm,
            update_table_status_perm, take_order_perm, view_kds_perm, manage_kds_perm, payment_perm
        ]
        groups['MANAGER'].permissions.set(manager_perms)

        # CASHIER gets view and payment
        cashier_perms = [
            Permission.objects.get(codename='view_category', content_type=category_ct),
            Permission.objects.get(codename='view_item', content_type=item_ct),
            view_table_perm,
            update_table_status_perm,
            take_order_perm,
            view_kds_perm,
            payment_perm
        ]
        groups['CASHIER'].permissions.set(cashier_perms)

        # STAFF gets take order and view kds
        staff_perms = [
            view_table_perm,
            update_table_status_perm,
            take_order_perm,
            view_kds_perm
        ]
        groups['STAFF'].permissions.set(staff_perms)

        self.stdout.write(self.style.SUCCESS('Groups and permissions successfully initialized.'))
