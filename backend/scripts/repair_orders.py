import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from restaurants.models import Order, Table

def repair_orders():
    print("Starting Order Repair Script...")
    
    # 1. Fix orders with store=None that have a table
    orders_with_table = Order.objects.filter(store__isnull=True, table__isnull=False)
    count_t = 0
    for order in orders_with_table:
        if order.table.store:
            order.store = order.table.store
            order.save(update_fields=['store'])
            count_t += 1
    
    print(f"Fixed {count_t} Dine-in orders from table data.")

    # 2. Fix orders with store=None and table=None (Parcel orders)
    # We try to infer store from the waiter, or default to Store 1
    orders_parcel = Order.objects.filter(store__isnull=True, table__isnull=True)
    count_p = 0
    for order in orders_parcel:
        if order.waiter and hasattr(order.waiter, 'store') and order.waiter.store:
            order.store = order.waiter.store
            order.save(update_fields=['store'])
            count_p += 1
        else:
            # Default to Main Branch (ID 1)
            from stores.models import Store
            main_branch = Store.objects.filter(id=1).first()
            if main_branch:
                order.store = main_branch
                order.save(update_fields=['store'])
                count_p += 1

    print(f"Fixed {count_p} Parcel orders from waiter/default data.")
    
    # 3. Final Check
    remaining = Order.objects.filter(store__isnull=True).count()
    if remaining == 0:
        print("Success! All orders now have an associated store.")
    else:
        print(f"Warning: {remaining} orders still missing store data.")

if __name__ == "__main__":
    repair_orders()
