from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TableViewSet, OrderViewSet, OrderItemViewSet, 
    ReservationViewSet, KitchenDisplayViewSet, InvoiceViewSet, ReportViewSet
)

router = DefaultRouter()
router.register(r'tables', TableViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'order-items', OrderItemViewSet)
router.register(r'reservations', ReservationViewSet)
router.register(r'kitchen', KitchenDisplayViewSet, basename='kitchen')
router.register(r'invoices', InvoiceViewSet)
router.register(r'reports', ReportViewSet, basename='reports')

urlpatterns = [
    path('', include(router.urls)),
]
