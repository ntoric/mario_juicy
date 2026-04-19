from rest_framework import permissions
from django.core.cache import cache

class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to users with the ADMIN role (Group membership).
    Uses Redis caching for faster lookups.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        cache_key = f"user_is_admin_{request.user.id}"
        is_admin = cache.get(cache_key)
        
        if is_admin is None:
            is_admin = request.user.groups.filter(name='ADMIN').exists() or request.user.is_superuser
            cache.set(cache_key, is_admin, timeout=3600) # Cache for 1 hour
            
        return is_admin

class IsManagerUserRole(permissions.BasePermission):
    """
    Allows access only to users with the MANAGER or ADMIN role.
    Uses Redis caching for faster lookups.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        cache_key = f"user_is_manager_or_admin_{request.user.id}"
        is_allowed = cache.get(cache_key)
        
        if is_allowed is None:
            is_allowed = request.user.groups.filter(name__in=['ADMIN', 'MANAGER']).exists() or request.user.is_superuser
            cache.set(cache_key, is_allowed, timeout=3600) # Cache for 1 hour
            
        return is_allowed

class HasDiscretePermission(permissions.BasePermission):
    """
    Check if user has ANY of the provided permissions. (OR logic)
    """
    def __init__(self, *perms):
        self.perms = perms

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return any(request.user.has_perm(p) for p in self.perms) or request.user.is_admin

class HasPermOrRole(permissions.BasePermission):
    """
    Check if user has a discrete permission OR a specific role (Group).
    Avoids the bitwise OR operator which can be flaky with dynamic instances.
    """
    def __init__(self, perm, roles=None):
        self.perm = perm
        self.roles = roles or ['ADMIN', 'MANAGER']

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Superuser and Admin Group always allowed
        if request.user.is_superuser or request.user.groups.filter(name='ADMIN').exists():
            return True
            
        # Check discrete permission
        if request.user.has_perm(self.perm):
            return True
            
        # Check roles
        if request.user.groups.filter(name__in=self.roles).exists():
            return True
            
        return False

class UserCreationPermission(permissions.BasePermission):
    """
    Hierarchy:
    - SUPER_ADMIN: can add {Admin, Manager, Cashier, Staff}
    - ADMIN: can add {Manager, Cashier, Staff}
    - MANAGER: can add {Cashier, Staff}
    - CASHIER/STAFF: Cannot add anyone.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Super admin and Admin can access the user management in general
        # Managers can also access it to add staff/cashiers
        return request.user.is_manager or request.user.is_super_admin

    def has_object_permission(self, request, view, obj):
        # Prevent editing users with higher or equal roles (except for Super Admin)
        if request.user.is_super_admin:
            return True
            
        if obj.is_super_admin:
            return False
            
        if request.user.is_admin:
            # Admin can edit everyone except Super Admin
            return not obj.is_super_admin
            
        if request.user.is_manager:
            # Manager can only edit Cashier and Staff
            return not (obj.is_admin or obj.is_manager)
            
        return False
