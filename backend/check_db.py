import os
import django
from django.db import connection

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

def check_table_columns(table_name):
    print(f"\n--- Checking Table: {table_name} ---")
    with connection.cursor() as cursor:
        try:
            # This logic works for both PostgreSQL and SQLite
            if connection.vendor == 'postgresql':
                cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'")
            else:
                cursor.execute(f"PRAGMA table_info({table_name})")
            
            columns = cursor.fetchall()
            if not columns:
                print(f"  [X] Table '{table_name}' not found!")
                return
            
            print("  Columns found:")
            for col in columns:
                # pg returns (name,), sqlite returns (id, name, type, ...)
                name = col[0] if connection.vendor == 'postgresql' else col[1]
                print(f"    - {name}")
                
        except Exception as e:
            print(f"  [X] Error checking table '{table_name}': {e}")

if __name__ == "__main__":
    # Check key tables for the store_id column
    tables_to_check = [
        'users_user',
        'catalogs_category',
        'catalogs_item',
        'restaurants_order',
        'core_taxconfiguration'
    ]
    
    for table in tables_to_check:
        check_table_columns(table)
    
    print("\nDIAGNOSIS COMPLETE.")
    print("If 'store_id' is missing from any of these tables, you MUST run: python manage.py migrate")
