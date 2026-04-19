from rest_framework import viewsets, permissions, views
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Avg, F
from .models import Store
from .serializers import StoreSerializer
from datetime import timedelta

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_super_admin:
            return Store.objects.all()
        if user.store:
            return Store.objects.filter(id=user.store.id)
        return Store.objects.none()

    def perform_create(self, serializer):
        if not self.request.user.is_super_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Super Admins can create new stores")
        serializer.save()

    def perform_update(self, serializer):
        # Restriction: Only super admins can update specific feature flags
        feature_flags = ['is_kitchen_step_enabled', 'is_take_away_enabled', 'is_reservations_enabled']
        if any(flag in self.request.data for flag in feature_flags):
            if not self.request.user.is_super_admin:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only Super Admins can update restaurant-wide feature toggles")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_super_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Super Admins can delete stores")
        instance.delete()

class DashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        store = user.store
        
        from restaurants.models import Invoice, Order, Table, OrderItem
        
        if not store and not user.is_super_admin:
            return Response({"error": "No store associated with user"}, status=400)
            
        # If superadmin but no store, take first store or all? Usually dashboard is per store.
        if not store and user.is_super_admin:
            store = Store.objects.first()
            
        if not store:
            return Response({"error": "No stores found in system"}, status=404)

        today = timezone.now().date()
        start_of_day = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        end_of_day = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.max.time()))
        
        # Today's stats
        today_invoices = Invoice.objects.filter(store=store, created_at__range=(start_of_day, end_of_day))
        today_sales = today_invoices.aggregate(total=Sum('total_amount'))['total'] or 0
        today_orders_count = today_invoices.count()
        avg_ticket = today_invoices.aggregate(avg=Avg('total_amount'))['avg'] or 0
        
        # Table Occupancy
        total_tables = Table.objects.filter(store=store, is_active=True).count()
        occupied_tables = Table.objects.filter(store=store, is_active=True, status='OCCUPIED').count()
        table_occupancy = (occupied_tables / total_tables * 100) if total_tables > 0 else 0
        
        # Recent Transactions
        recent_invoices = Invoice.objects.filter(store=store).order_by('-created_at')[:5]
        recent_data = []
        for inv in recent_invoices:
            recent_data.append({
                "id": inv.invoice_number,
                "customer": inv.order.customer_name or (f"Table {inv.order.table.number}" if inv.order.table else "N/A"),
                "total": f"₹{inv.total_amount}",
                "status": "Completed"  # Invoices are generally for completed/paid orders
            })
            
        # Popular Items (Today)
        popular_items = OrderItem.objects.filter(
            order__store=store, 
            created_at__range=(start_of_day, end_of_day)
        ).values('item__name').annotate(
            sales_count=Sum('quantity'),
            total_sales_amount=Sum(F('price') * F('quantity'))
        ).order_by('-sales_count')[:3]
        
        popular_data = []
        for item in popular_items:
            popular_data.append({
                "name": item['item__name'],
                "sales": item['sales_count'],
                "amount": float(item['total_sales_amount'])
            })

        # Calculate Trends (Mocked for now or compared to yesterday)
        # For simplicity, we'll just provide the values and frontend can handle trend if needed later
        
        return Response({
            "stats": [
                { "label": "Today's Sales", "value": f"₹{float(today_sales):,.2f}", "trend": "+0.0%", "color": "var(--accent-primary)" },
                { "label": "Transactions", "value": str(today_orders_count), "trend": "+0.0%", "color": "#10b981" },
                { "label": "Avg. Ticket", "value": f"₹{float(avg_ticket):,.2f}", "trend": "+0.0%", "color": "#f59e0b" },
                { "label": "Table Occupancy", "value": f"{table_occupancy:.1f}%", "trend": "Active", "color": "#6366f1" },
            ],
            "recent_transactions": recent_data,
            "popular_items": popular_data
        })
