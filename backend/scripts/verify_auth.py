import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
os.environ['DATABASE_URL'] = 'sqlite:///db.sqlite3'
os.environ['DATABASE_URL_LOGGER'] = 'sqlite:///db_logger.sqlite3'

import django
django.setup()

from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import Group
from users.models import User

def test_auth():
    client = APIClient()
    
    # 1. Test Login
    print("Testing Login with Admin...")
    response = client.post('/api/users/login/', {
        'username': 'admin',
        'password': 'adminpassword'
    }, format='json')
    
    if response.status_code == 200:
        print("✅ Login successful")
        access_token = response.data['access']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    else:
        print(f"❌ Login failed (status {response.status_code})")
        return

    # 2. Test Profile Access
    print("\nTesting Profile Access...")
    response = client.get('/api/users/profile/', format='json')
    if response.status_code == 200:
        print(f"✅ Profile access successful: {response.data['username']} (Groups: {response.data['roles']})")
    else:
        print(f"❌ Profile access failed: {response.status_code}")

    # 3. Test Admin Only Access
    print("\nTesting Admin Only Access...")
    response = client.get('/api/users/admin-only/', format='json')
    if response.status_code == 200:
        print(f"✅ Admin only access successful: {response.data}")
    else:
        print(f"❌ Admin only access failed: {response.status_code}")

    # 4. Create a Cashier via API and test their access
    print("\nCreating Cashier user via Admin API...")
    User.objects.filter(username='cashier_new').delete()
    
    # Use management endpoint
    response = client.post('/api/users/management/', {
        'username': 'cashier_new',
        'password': 'cashierpassword',
        'role': 'CASHIER'
    }, format='json')
    
    if response.status_code == 201:
        print("✅ Cashier created successfully via API")
    else:
        print(f"❌ Failed to create cashier: {response.status_code} {response.data}")
        return

    # Login as Cashier
    client_cashier = APIClient()
    response = client_cashier.post('/api/users/login/', {
        'username': 'cashier_new',
        'password': 'cashierpassword'
    }, format='json')
    access_token_cashier = response.data['access']
    client_cashier.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token_cashier}')
    
    # Check profile
    response = client_cashier.get('/api/users/profile/', format='json')
    print(f"Cashier Profile: {response.data['roles']}")

    print("\nTesting Cashier access to Admin-only endpoint...")
    response = client_cashier.get('/api/users/admin-only/', format='json')
    if response.status_code == 403:
        print("✅ Cashier correctly blocked from Admin-only endpoint")
    else:
        print(f"❌ Cashier NOT blocked from Admin-only endpoint (Status: {response.status_code})")

    # 5. Test management access for Cashier
    print("\nTesting Cashier access to User Management endpoint...")
    response = client_cashier.get('/api/users/management/', format='json')
    if response.status_code == 403:
        print("✅ Cashier correctly blocked from User Management")
    else:
        print(f"❌ Cashier NOT blocked from User Management (Status: {response.status_code})")

    print("\nVerification Complete.")

if __name__ == '__main__':
    test_auth()
