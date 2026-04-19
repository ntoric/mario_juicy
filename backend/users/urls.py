from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    UserViewSet, 
    UserProfileView, 
    DemoRoleAccessView,
    AdminOnlyView,
    LogoutView,
    MenuPermissionViewSet,
    GroupListView
)

router = DefaultRouter()
router.register(r'management', UserViewSet, basename='user-management')
router.register(r'menu-permissions', MenuPermissionViewSet, basename='menu-permissions')

urlpatterns = [
    # Auth
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    
    # User Profile
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('groups/', GroupListView.as_view(), name='group-list'),
    
    # Management
    path('', include(router.urls)),
    
    # Demo/Testing
    path('test-access/', DemoRoleAccessView.as_view(), name='test-access'),
    path('admin-only/', AdminOnlyView.as_view(), name='admin-only'),
]
