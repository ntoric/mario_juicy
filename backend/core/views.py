from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import TaxConfiguration
from .serializers import TaxConfigurationSerializer
from restaurants.models import Order, OrderItem, Invoice, Reservation, Table
from catalogs.models import Item, Category
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

from core.mixins import StoreFilterMixin

class TaxConfigurationViewSet(viewsets.ModelViewSet):
    queryset = TaxConfiguration.objects.all()
    serializer_class = TaxConfigurationSerializer
    permission_classes = [IsAuthenticated]

    def _get_store_context(self):
        user = self.request.user
        store = None
        
        try:
            if not user.is_staff and not user.is_superuser:
                store = getattr(user, 'store', None)
            else:
                store_id = self.request.headers.get('X-Store-ID')
                if store_id:
                    from stores.models import Store
                    store = Store.objects.filter(id=store_id).first()
                else:
                    # Default to Main Branch for admins if no header
                    from stores.models import Store
                    store = Store.objects.filter(id=1).first()
        except Exception:
            store = None
        return store

    def get_object(self):
        store = self._get_store_context()
        return TaxConfiguration.get_for_store(store)

    def list(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        # Redirect create to update of the singleton
        return self.partial_update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class SystemResetView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if not getattr(request.user, 'is_super_admin', False):
            return Response({"detail": "Only Super Admins can perform system reset."}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        target = request.data.get('target', 'all')
        
        try:
            with transaction.atomic():
                if target == 'orders' or target == 'all':
                    OrderItem.objects.all().delete()
                    Invoice.objects.all().delete()
                    Order.objects.all().delete()
                
                if target == 'reservations' or target == 'all':
                    Reservation.objects.all().delete()
                
                if target == 'catalog' or target == 'all':
                    Item.objects.all().delete()
                    Category.objects.all().delete()
                
                if target == 'tables' or target == 'all':
                    # Before deleting tables, we must ensure all related orders are gone.
                    # Since 'orders' reset is above or 'all' includes it, we check if orders exist if only tables is selected
                    if target == 'tables' and Order.objects.exists():
                        return Response({"detail": "Cannot reset tables while orders exist. Reset orders first."}, 
                                        status=status.HTTP_400_BAD_REQUEST)
                    Table.objects.all().delete()
                
                if target == 'users' or target == 'all':
                    # Delete all users EXCEPT superusers and the current user
                    User.objects.exclude(is_superuser=True).exclude(id=request.user.id).delete()
                
                if target == 'settings' or target == 'all':
                    # Reset TaxConfiguration to defaults
                    tax = TaxConfiguration.get_solo()
                    tax.tax_type = 'EXCLUSIVE'
                    tax.is_gst_enabled = True
                    tax.cgst_rate = 2.50
                    tax.sgst_rate = 2.50
                    tax.igst_rate = 0.00
                    tax.is_cess_enabled = False
                    tax.cess_rate = 0.00
                    tax.is_active = True
                    tax.save()

            return Response({"detail": f"System reset for '{target}' completed successfully."}, 
                            status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
