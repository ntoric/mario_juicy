from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreViewSet, DashboardStatsView

router = DefaultRouter()
router.register(r'', StoreViewSet)

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]
