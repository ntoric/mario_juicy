from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import Group, Permission
from .models import User, MENU_PERMISSIONS
from .serializers import UserSerializer, UserProfileSerializer, MenuPermissionSerializer, GroupSerializer
from .permissions import IsAdminUserRole, UserCreationPermission

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users. 
    Restricted by role hierarchy.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [UserCreationPermission]

    def perform_create(self, serializer):
        # Validate that the creator has permission to create a user with the requested role
        creator = self.request.user
        target_role = self.request.data.get('role', 'STAFF').upper()
        
        if not creator.is_super_admin:
            if target_role == 'SUPER_ADMIN':
                raise permissions.exceptions.PermissionDenied("Only Super Admins can create Super Admins")
            if target_role == 'ADMIN' and not creator.is_super_admin:
                raise permissions.exceptions.PermissionDenied("Only Super Admins can create Admins")
            if creator.is_manager and target_role not in ['CASHIER', 'STAFF']:
                 raise permissions.exceptions.PermissionDenied("Managers can only create Cashiers or Staff")
        
        if not creator.is_super_admin and creator.store:
            # Non-superadmins can only create users for their own store
            serializer.save(store=creator.store)
        else:
            serializer.save()

    def perform_update(self, serializer):
        creator = self.request.user
        if not creator.is_super_admin:
            # Ensure non-superadmins can't change the store field of a user
            if 'store' in self.request.data:
                # If they try to change it to something else, we ignore it or raise error
                # For safety, we'll force it to stay the same or stay within their store
                serializer.save(store=creator.store)
                return
        
        serializer.save()

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            return User.objects.all().order_by('id')
        if user.store:
            return User.objects.filter(store=user.store).order_by('id')
        return User.objects.filter(id=user.id).order_by('id')

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    View for the current authenticated user to see and update their profile.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class DemoRoleAccessView(APIView):
    """
    Demo view to test role-based access.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            "message": f"Hello {request.user.username}, your role is {request.user.role}",
            "user_id": request.user.id,
            "role": request.user.role
        })

class AdminOnlyView(APIView):
    permission_classes = [IsAdminUserRole]
    def get(self, request):
        return Response({"message": "Welcome Admin!"})

class LogoutView(APIView):
    """
    View to blacklist the refresh token on logout.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({"message": "Successfully logged out"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class GroupListView(generics.ListAPIView):
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

class MenuPermissionViewSet(viewsets.ViewSet):
    """
    ViewSet for Super Admin to manage menu permissions for each role.
    Now directly manages Django Group permissions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        group_id = request.query_params.get('group')
        if not group_id:
            return Response({"detail": "Group ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({"detail": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        group_permissions = group.permissions.all().values_list('content_type__app_label', 'codename')
        group_perm_labels = {f"{app}.{code}" for app, code in group_permissions}
        
        results = []
        for menu_key, required_perms in MENU_PERMISSIONS.items():
            if not required_perms: continue
            
            # For simplicity, if role has ANY of the permissions, it's "enabled"
            is_enabled = any(p in group_perm_labels for p in required_perms)
            results.append({
                "id": None, # Virtual ID
                "group": group.id,
                "group_name": group.name,
                "menu_key": menu_key,
                "is_enabled": is_enabled
            })
            
        return Response(results)

    def create(self, request, *args, **kwargs):
        if not request.user.is_super_admin:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        
        group_id = request.data.get('group')
        menu_key = request.data.get('menu_key')
        is_enabled = request.data.get('is_enabled')

        if not group_id or not menu_key:
            return Response({"detail": "Missing data"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            return Response({"detail": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        required_perms = MENU_PERMISSIONS.get(menu_key, [])
        for perm_label in required_perms:
            app_label, codename = perm_label.split('.')
            perm = Permission.objects.get(content_type__app_label=app_label, codename=codename)
            if is_enabled:
                group.permissions.add(perm)
            else:
                group.permissions.remove(perm)
        
        return Response({
            "group": group.id,
            "menu_key": menu_key,
            "is_enabled": is_enabled
        })

    def update(self, request, *args, **kwargs):
        # We can just redirect to create as it handles toggle
        return self.create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        # Handle PATCH from frontend by using menu_key from URL if needed, 
        # but my frontend sends everything in body for create/POST too.
        # Let's support PATCH /users/menu-permissions/{id}/
        
        # If it's a PATCH to an existing virtual ID (which we don't have)
        # the frontend might use the pk from a previous list.
        # But we don't have real IDs. Let's just use create logic.
        return self.create(request, *args, **kwargs)
