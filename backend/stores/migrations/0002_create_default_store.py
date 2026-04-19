from django.db import migrations

def create_default_store(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    User = apps.get_model('users', 'User')
    Category = apps.get_model('catalogs', 'Category')
    Item = apps.get_model('catalogs', 'Item')
    Table = apps.get_model('restaurants', 'Table')
    Order = apps.get_model('restaurants', 'Order')
    Reservation = apps.get_model('restaurants', 'Reservation')
    Invoice = apps.get_model('restaurants', 'Invoice')
    TaxConfiguration = apps.get_model('core', 'TaxConfiguration')

    # Create default store
    default_store, _ = Store.objects.get_or_create(
        id=1,
        defaults={
            'name': 'Main Branch',
            'address': 'Main Street, City',
            'invoice_prefix': 'MAIN',
            'is_active': True
        }
    )

    # Link everything to default store
    User.objects.all().update(store=default_store)
    Category.objects.all().update(store=default_store)
    Item.objects.all().update(store=default_store)
    Table.objects.all().update(store=default_store)
    Order.objects.all().update(store=default_store)
    Reservation.objects.all().update(store=default_store)
    Invoice.objects.all().update(store=default_store)
    TaxConfiguration.objects.all().update(store=default_store)

class Migration(migrations.Migration):

    dependencies = [
        ('stores', '0001_initial'),
        ('users', '0005_user_store'),
        ('catalogs', '0004_category_store_item_store_alter_category_name_and_more'),
        ('restaurants', '0007_invoice_store_order_store_reservation_store_and_more'),
        ('core', '0002_taxconfiguration_store'),
    ]

    operations = [
        migrations.RunPython(create_default_store),
    ]
