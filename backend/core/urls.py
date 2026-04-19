from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaxConfigurationViewSet, SystemResetView

router = DefaultRouter()
router.register(r'tax-configuration', TaxConfigurationViewSet, basename='tax-configuration')

urlpatterns = [
    path('', include(router.urls)),
    path('system-reset/', SystemResetView.as_view(), name='system-reset'),
]
