from rest_framework import serializers
from django.contrib.auth.models import Group
from .models import User, MENU_PERMISSIONS

class MenuPermissionSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True, required=False)
    group = serializers.IntegerField()
    group_name = serializers.CharField(read_only=True)
    menu_key = serializers.CharField()
    is_enabled = serializers.BooleanField()

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ('id', 'name')

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(write_only=True, required=False)
    groups = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field='name'
    )

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'groups', 'role', 'password', 'is_active', 'store')
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'is_active': {'default': True},
            'store': {'required': False}
        }

    def create(self, validated_data):
        role_name = validated_data.pop('role', 'CASHIER')
        password = validated_data.pop('password', None)
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password,
            is_active=validated_data.get('is_active', True),
            store=validated_data.get('store', None)
        )
        
        # Map role to group
        if role_name:
            group, _ = Group.objects.get_or_create(name=role_name.upper())
            user.groups.add(group)
            
        return user

    def update(self, instance, validated_data):
        role_name = validated_data.pop('role', None)
        password = validated_data.pop('password', None)
        
        if role_name:
            instance.groups.clear()
            group, _ = Group.objects.get_or_create(name=role_name.upper())
            instance.groups.add(group)
        
        if password:
            instance.set_password(password)
            
        return super().update(instance, validated_data)

class UserProfileSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(
        source='groups',
        many=True,
        read_only=True,
        slug_field='name'
    )
    store = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    primary_role = serializers.SerializerMethodField()
    allowed_menus = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'roles', 'primary_role', 'permissions', 'allowed_menus', 'first_name', 'last_name', 'store')
        read_only_fields = ('id', 'username', 'roles', 'primary_role', 'permissions', 'allowed_menus', 'store')

    def get_store(self, obj):
        try:
            # Check if store relationship exists and is accessible
            if hasattr(obj, 'store') and obj.store:
                return {
                    'id': obj.store.id,
                    'name': obj.store.name,
                    'invoice_prefix': obj.store.invoice_prefix,
                    'is_kitchen_step_enabled': obj.store.is_kitchen_step_enabled,
                    'is_take_away_enabled': obj.store.is_take_away_enabled,
                    'is_reservations_enabled': obj.store.is_reservations_enabled
                }
        except Exception:
            # Fallback if field doesn't exist in DB context (e.g. pending migrations)
            return None
        return None

    def get_permissions(self, obj):
        return list(obj.get_all_permissions())

    def get_primary_role(self, obj):
        # Return the highest role
        if obj.is_super_admin: return 'SUPER_ADMIN'
        if obj.is_admin: return 'ADMIN'
        if obj.is_manager: return 'MANAGER'
        if obj.is_cashier: return 'CASHIER'
        if obj.is_staff_member: return 'STAFF'
        return 'UNKNOWN'

    def get_allowed_menus(self, obj):
        # Super admin sees everything
        if obj.is_super_admin:
            return None
            
        permissions = obj.get_all_permissions()
        allowed = []
        
        for menu_key, required_perms in MENU_PERMISSIONS.items():
            if not required_perms:
                allowed.append(menu_key)
                continue
                
            # If any of the required permissions are present, we allow the menu
            # Or should it be ALL? Usually ONE is enough to see the menu.
            # Most menus have only one anyway.
            if any(p in permissions for p in required_perms):
                allowed.append(menu_key)
                
        return allowed
