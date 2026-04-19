import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from users.models import User

def create_admin():
    username = 'admin'
    password = 'adminpassword'
    email = 'admin@example.com'
    
    if not User.objects.filter(username=username).exists():
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role=User.ADMIN
        )
        print(f"Admin user '{username}' created successfully with role {user.role}.")
    else:
        print(f"User '{username}' already exists.")

if __name__ == '__main__':
    create_admin()
