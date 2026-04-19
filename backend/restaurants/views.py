from rest_framework import viewsets, status, decorators, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, F, Count, Avg, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Table, Order, OrderItem, Reservation, Invoice
from .serializers import (
    TableSerializer, OrderSerializer, OrderItemSerializer, 
    ReservationSerializer, InvoiceSerializer
)
from core.models import TaxConfiguration
from decimal import Decimal


from core.mixins import StoreFilterMixin
from users.permissions import HasDiscretePermission, IsManagerUserRole, HasPermOrRole
from django.http import HttpResponse
from django.template.loader import get_template
import io

class TableViewSet(StoreFilterMixin, viewsets.ModelViewSet):
    queryset = Table.objects.all()
    serializer_class = TableSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_permissions(self):
        if self.action in ['update_position', 'create', 'update', 'destroy']:
            return [HasDiscretePermission('users.manage_table_layout_access')]
        if self.action in ['list', 'retrieve']:
            return [HasDiscretePermission('users.view_table_layout_access')]
        if self.action in ['partial_update', 'release']:
            # Allow Edit if user can manage layout OR if they can update status
            return [HasDiscretePermission('users.manage_table_layout_access', 
                                         'users.access_to_update_table_status',
                                         'users.access_to_payment_management')]
        return super().get_permissions()

    @action(detail=True, methods=['patch'])
    def update_position(self, request, pk=None):
        """Update table map position and shape."""
        table = self.get_object()
        table.pos_x = request.data.get('pos_x', table.pos_x)
        table.pos_y = request.data.get('pos_y', table.pos_y)
        table.shape = request.data.get('shape', table.shape)
        table.save()
        serializer = self.get_serializer(table)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Force release a table by cancelling all its active orders."""
        table = self.get_object()
        
        # Terminal statuses that mean the order is already done
        TERMINAL_STATUSES = ['PAID', 'CANCELLED', 'COMPLETED', 'RETURNED']
        
        # Get active orders
        active_orders = Order.objects.filter(table=table).exclude(status__in=TERMINAL_STATUSES)
        
        cancelled_count = 0
        for order in active_orders:
            order.status = 'CANCELLED'
            order.notes = (f"{order.notes}\n" if order.notes else "") + f"System: Table force released by {request.user.username}."
            order.save()
            cancelled_count += 1
            
        # Ensure table status is reset
        table.status = 'VACANT'
        table.save(update_fields=['status'])
        
        return Response({
            'detail': f'Table {table.number} released. {cancelled_count} active orders were cancelled.',
            'cancelled_count': cancelled_count,
            'status': table.status
        })

    @action(detail=False, methods=['post'])
    def recalculate_all(self, request):
        """Iterate through all tables and force recalculate their status based on active orders."""
        tables = self.get_queryset()
        updated_count = 0
        
        for table in tables:
            old_status = table.status
            new_status = table.update_status()
            if old_status != new_status:
                updated_count += 1
                
        return Response({
            'detail': f'Recalculated statuses for {tables.count()} tables. {updated_count} tables were updated.',
            'total_tables': tables.count(),
            'updated_tables': updated_count
        })


class OrderViewSet(StoreFilterMixin, viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_queryset(self):
        """
        Custom filtering for Orders:
        - Use StoreFilterMixin's logic.
        - Also allow orders that have store=None but table.store=active_store.
        """
        queryset = super().get_queryset()
        
        # If we are filtering by store_id (from Mixin)
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset
            
        store_id = None
        if user.is_admin:
            store_id = self.request.headers.get('X-Store-ID')
            if not store_id or not store_id.isdigit():
                store_id = "1"
        elif hasattr(user, 'store') and user.store:
            store_id = str(user.store.id)
            
        if store_id:
            from django.db.models import Q
            # Be more inclusive: matches order.store OR (order.store is null AND table.store matches)
            # We use self.queryset (unfiltered) and apply the broader filter
            base_queryset = Order.objects.all()
            return base_queryset.filter(
                Q(store_id=store_id) | 
                Q(store__isnull=True, table__store_id=store_id)
            ).distinct()
            
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'add_item', 'send_to_kitchen']:
            return [HasDiscretePermission('users.access_to_take_order')]
        if self.action == 'destroy':
            return [HasPermOrRole('users.access_to_delete_order')]
        
        if self.action == 'checkout':
            return [HasPermOrRole('users.access_to_payment_management', roles=['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'])]

        if self.action in ['recalculate_total', 'update_payment_status', 'release']:
            return [HasPermOrRole('users.access_to_payment_management')]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        order = self.get_object()
        
        # Recovery: If order.store is missing, try to get it from table
        if not order.store and order.table and order.table.store:
            order.store = order.table.store
            order.save(update_fields=['store'])

        # Validation: Ensure order is not in a terminal state
        if order.status in ['PAID', 'CANCELLED']:
            return Response(
                {'error': f'Cannot add items to an order with status: {order.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = OrderItemSerializer(data=request.data)
        if serializer.is_valid():
            # Check if item belongs to the same store as order
            item = serializer.validated_data['item']
            if order.store and item.store and item.store != order.store:
                return Response(
                    {'error': 'Item belongs to a different store than the order.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                serializer.save(order=order)
                self._update_total(order)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def recalculate_total(self, request, pk=None):
        order = self.get_object()
        self._update_total(order)
        return Response({'total_amount': str(order.total_amount)})

    @action(detail=True, methods=['post'])
    def send_to_kitchen(self, request, pk=None):
        """Batch-update all ORDERED items and advance order status."""
        order = self.get_object()
        store = order.store
        
        # Determine next status based on store setting
        next_item_status = 'AWAITING'
        next_order_status = 'AWAITING'
        
        if store and not store.is_kitchen_step_enabled:
            next_item_status = 'PREPARING'
            next_order_status = 'PREPARING'

        # Special Case: Parcels go directly to PREPARING after KOT regardless of kitchen step setting
        if order.order_type == 'TAKE_AWAY':
            next_item_status = 'PREPARING'
            next_order_status = 'PREPARING'
            
        updated = order.items.filter(status='ORDERED').update(status=next_item_status)
        
        if order.status == 'ORDER_TAKEN':
            order.status = next_order_status
            order.save(update_fields=['status'])
            
        serializer = self.get_serializer(order)
        return Response({'updated_items': updated, 'order': serializer.data})

    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        """Cancel order with a reason stored in notes."""
        order = self.get_object()
        reason = request.data.get('reason', '')
        
        full_reason = f"CANCELLED: {reason}\n{order.notes if order.notes else ''}".strip()
        
        order.status = 'CANCELLED'
        order.notes = full_reason
        order.save(update_fields=['status', 'notes'])

        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def update_payment_status(self, request, pk=None):
        """Manually update order status to PAID or COMPLETED."""
        order = self.get_object()
        new_status = request.data.get('status', 'PAID')
        if new_status not in ['PAID', 'COMPLETED', 'CANCELLED']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = new_status
        order.save(update_fields=['status'])

        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def serve_all_ready(self, request, pk=None):
        """Batch-update all READY and PREPARING items to SERVED."""
        order = self.get_object()
        updated = order.items.filter(status__in=['READY', 'PREPARING']).update(status='SERVED')
        
        # If all items are now served, we could advance order status to SERVED
        # but usually we wait for manual confirmation or specific flow.
        # Let's check if all preparing/ready items are gone.
        remaining = order.items.filter(status__in=['ORDERED', 'PREPARING', 'READY']).exists()
        if not remaining and order.status in ['AWAITING', 'PREPARING', 'READY']:
            order.status = 'SERVED'
            order.save(update_fields=['status'])
            
        serializer = self.get_serializer(order)
        return Response({'updated_items': updated, 'order': serializer.data})

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """
        Finalize order, calculate taxes, and generate invoice.
        By default, marks order as PAID.
        """
        order = self.get_object()
        
        # If order already has an invoice
        if hasattr(order, 'invoice'):
            if order.status == 'PAID':
                return Response({'error': 'Order already paid'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update payment info if finalizing payment
            if request.data.get('mark_as_paid', True):
                order.status = 'PAID'
                order.save(update_fields=['status'])
                
                # Update invoice payment method if sent
                invoice = order.invoice
                invoice.payment_method = request.data.get('payment_method', invoice.payment_method)
                invoice.save(update_fields=['payment_method'])
                
            return Response(InvoiceSerializer(order.invoice).data)

        # Ensure order has items
        if not order.items.exists():
            return Response(
                {'error': f'Cannot checkout order #{order.id} without items. Current status: {order.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get Tax Configuration for the store
        tax_config = TaxConfiguration.get_for_store(order.store)
        
        # GST Type: INTRA_STATE (CGST+SGST) or INTER_STATE (IGST)
        gst_type = request.data.get('gst_type', 'INTRA_STATE')
        
        subtotal = order.total_amount
        tax_amount = Decimal('0.00')
        tax_details = {}

        if tax_config.is_active:
            if tax_config.tax_type == 'EXCLUSIVE':
                # GST Components
                if tax_config.is_gst_enabled:
                    if gst_type == 'INTER_STATE':
                        igst = (subtotal * tax_config.igst_rate) / 100
                        tax_amount += igst
                        if igst > 0: tax_details['IGST'] = str(igst.quantize(Decimal('0.01')))
                    else:
                        cgst = (subtotal * tax_config.cgst_rate) / 100
                        sgst = (subtotal * tax_config.sgst_rate) / 100
                        tax_amount += (cgst + sgst)
                        if cgst > 0: tax_details['CGST'] = str(cgst.quantize(Decimal('0.01')))
                        if sgst > 0: tax_details['SGST'] = str(sgst.quantize(Decimal('0.01')))

                # CESS
                if tax_config.is_cess_enabled:
                    cess = (subtotal * tax_config.cess_rate) / 100
                    tax_amount += cess
                    tax_details['CESS'] = str(cess.quantize(Decimal('0.01')))
            
            elif tax_config.tax_type == 'INCLUSIVE':
                total_rate = Decimal('0.00')
                if tax_config.is_gst_enabled:
                    if gst_type == 'INTER_STATE':
                        total_rate += tax_config.igst_rate
                    else:
                        total_rate += (tax_config.cgst_rate + tax_config.sgst_rate)
                if tax_config.is_cess_enabled:
                    total_rate += tax_config.cess_rate
                
                if total_rate > 0:
                    actual_base = subtotal / (1 + (total_rate / 100))
                    tax_amount = subtotal - actual_base
                    
                    # Breakdown for inclusive
                    if tax_config.is_gst_enabled:
                        if gst_type == 'INTER_STATE':
                            tax_details['IGST (Incl.)'] = str(((actual_base * tax_config.igst_rate) / 100).quantize(Decimal('0.01')))
                        else:
                            tax_details['CGST (Incl.)'] = str(((actual_base * tax_config.cgst_rate) / 100).quantize(Decimal('0.01')))
                            tax_details['SGST (Incl.)'] = str(((actual_base * tax_config.sgst_rate) / 100).quantize(Decimal('0.01')))
                    if tax_config.is_cess_enabled:
                        tax_details['CESS (Incl.)'] = str(((actual_base * tax_config.cess_rate) / 100).quantize(Decimal('0.01')))

        total_amount = subtotal
        if tax_config.tax_type == 'EXCLUSIVE':
            total_amount = subtotal + tax_amount

        # Create Invoice
        payment_method = request.data.get('payment_method', 'CASH')
        
        invoice = Invoice.objects.create(
            invoice_number=Invoice.generate_invoice_number(),
            store=order.store,
            order=order,
            subtotal=subtotal,
            tax_amount=tax_amount,
            tax_details=tax_details,
            total_amount=total_amount,
            payment_method=payment_method,
            waiter=request.user
        )

        # Update Order Status (optional for early bill generation in Parcel)
        if request.data.get('mark_as_paid', True):
            order.status = 'PAID'
            order.save(update_fields=['status'])
        
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def pending_settlements(self, request):
        """Return all COMPLETED orders and recent CANCELLED orders for audit."""
        queryset = self.get_queryset()
        
        from django.db.models import Q
        from django.utils import timezone
        from datetime import timedelta
        
        one_day_ago = timezone.now() - timedelta(days=1)
        
        pending = queryset.filter(
            Q(status='COMPLETED') | 
            (Q(status='CANCELLED') & Q(updated_at__gte=one_day_ago)) |
            (Q(invoice__isnull=False) & ~Q(status='PAID'))
        ).distinct()
        
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def return_order(self, request, pk=None):
        """Mark an order as RETURNED (loss)."""
        order = self.get_object()
        if order.status in ['PAID', 'COMPLETED']:
            return Response({'error': 'Cannot return a paid or completed order'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'RETURNED'
        order.save(update_fields=['status'])
        
        # Optionally mark all items as CANCELLED or similar?
        # User said "mark it as loss", which the status itself represents here.
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def change_table(self, request, pk=None):
        """Move an active order from one table to another."""
        order = self.get_object()
        target_table_id = request.data.get('target_table_id')
        new_person_count = request.data.get('number_of_persons')
        
        if not target_table_id:
            return Response({'error': 'target_table_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_table = Table.objects.get(pk=target_table_id, store=order.store)
        except Table.DoesNotExist:
            return Response({'error': 'Target table not found or belongs to another store'}, status=status.HTTP_404_NOT_FOUND)

        if not target_table.is_active:
            return Response({'error': 'Target table is inactive.'}, status=status.HTTP_400_BAD_REQUEST)

        old_table = order.table
        
        # Determine person count to check
        person_count_to_check = int(new_person_count) if new_person_count else order.number_of_persons
        
        # --- Capacity Check ---
        TERMINAL_STATUSES = ['PAID', 'CANCELLED', 'COMPLETED', 'RETURNED']
        active_on_target = Order.objects.filter(table=target_table).exclude(status__in=TERMINAL_STATUSES)
        
        # Exclude current order if moving to same table (updates persons)
        if old_table == target_table:
            active_on_target = active_on_target.exclude(id=order.id)
            
        current_persons_on_target = active_on_target.aggregate(total=Sum('number_of_persons'))['total'] or 0
        vacant_seats = (target_table.capacity + 2) - current_persons_on_target
        
        if old_table != target_table and current_persons_on_target >= target_table.capacity:
            return Response(
                {'error': f'Table {target_table.number} is already at full capacity ({target_table.capacity}). Cannot move new groups here.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if current_persons_on_target + person_count_to_check > target_table.capacity + 2:
            return Response(
                {'error': f'Maximum table capacity exceeded. Table {target_table.number} has capacity {target_table.capacity} and can only accommodate up to {target_table.capacity + 2} persons total. It currently has {current_persons_on_target} guests.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # ----------------------

        # Move the order and update persons if provided
        order.table = target_table
        if new_person_count:
            order.number_of_persons = person_count_to_check
        order.save() # This will set target_table to OCCUPIED/PARTIAL via Order.save() logic

        # Note: Both tables are automatically updated via Order.save() logic
        return Response(self.get_serializer(order).data)


    def _update_total(self, order):
        order.update_total_amount()

    def perform_create(self, serializer):
        # --- Capacity Check with Buffer (+2) ---
        table = serializer.validated_data.get('table')
        number_of_persons = serializer.validated_data.get('number_of_persons', 1)
        order_type = serializer.validated_data.get('order_type', 'DINE_IN')

        if table and order_type == 'DINE_IN':
            from django.db.models import Sum
            TERMINAL_STATUSES = ['PAID', 'CANCELLED', 'COMPLETED', 'RETURNED']
            active_persons = Order.objects.filter(table=table).exclude(status__in=TERMINAL_STATUSES).aggregate(
                total=Sum('number_of_persons')
            )['total'] or 0
            
            if active_persons >= table.capacity:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(f"Table {table.number} is already at full capacity ({table.capacity}). No more new groups can be started.")

            if active_persons + number_of_persons > table.capacity + 2:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(f"Maximum table capacity exceeded. Table {table.number} has capacity {table.capacity} and can only accommodate up to {table.capacity + 2} persons total.")
        # ----------------------------------------

        user = self.request.user
        extra_kwargs = {'waiter': user}
        
        if not user.is_admin:
            extra_kwargs['store'] = user.store
        else:
            store_id = self.request.headers.get('X-Store-ID')
            if store_id and store_id.isdigit():
                extra_kwargs['store_id'] = int(store_id)
            else:
                extra_kwargs['store_id'] = 1
                
        serializer.save(**extra_kwargs)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # If order status advanced to SERVED, ensure all READY items are also SERVED
        if instance.status == 'SERVED':
            instance.items.filter(status='READY').update(status='SERVED')
        
        # If status reached terminal COMPLETED/PAID, sync any remaining non-terminal items
        elif instance.status in ['COMPLETED', 'PAID']:
            instance.items.filter(
                status__in=['ORDERED', 'AWAITING', 'PREPARING', 'READY']
            ).update(status='SERVED')

    def perform_destroy(self, instance):
        table = instance.table
        instance.delete()
        if table:
            table.update_status()


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        # Filter order items by the store of their parent order
        queryset = super().get_queryset()
        user = self.request.user
        
        try:
            if user.is_admin:
                store_id = self.request.headers.get('X-Store-ID')
                if store_id:
                    return queryset.filter(order__store_id=store_id)
                return queryset.filter(order__store_id=1)
            
            if hasattr(user, 'store') and user.store:
                return queryset.filter(order__store=user.store)
        except Exception:
            # Fallback if DB schema doesn't match yet
            return queryset
            
        return queryset.none()

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.order.update_total_amount()


class ReservationViewSet(StoreFilterMixin, viewsets.ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer


class KitchenDisplayViewSet(StoreFilterMixin, viewsets.ViewSet):
    """
    Dedicated KDS (Kitchen Display System) view.
    Returns all active order items that need kitchen attention.
    """
    def get_permissions(self):
        if self.action in ['list']:
            return [HasDiscretePermission('users.access_to_view_kitchen_display')]
        return [HasDiscretePermission('users.access_to_manage_kitchen_queue')]

    def list(self, request):
        """Return all AWAITING and PREPARING items grouped by order."""
        items = OrderItem.objects.filter(
            status__in=['AWAITING', 'PREPARING']
        ).select_related('item', 'order', 'order__table').order_by('created_at')
        
        # Filter by store
        try:
            if not request.user.is_admin:
                if request.user.store:
                    items = items.filter(order__store=request.user.store)
            else:
                store_id = request.headers.get('X-Store-ID')
                if store_id:
                    items = items.filter(order__store_id=store_id)
                else:
                    items = items.filter(order__store_id=1)
        except Exception:
            # Fallback for pending migrations
            pass

        serializer = OrderItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def attend(self, request, pk=None):
        """Mark an item as PREPARING."""
        item = OrderItem.objects.get(pk=pk)
        item.status = 'PREPARING'
        item.save()
        
        # Also advance order status if it's still AWAITING
        if item.order.status == 'AWAITING':
            item.order.status = 'PREPARING'
            item.order.save(update_fields=['status'])
            
        return Response(OrderItemSerializer(item).data)

    @action(detail=True, methods=['post'])
    def ready(self, request, pk=None):
        """Mark an item as READY (Ready to serve)."""
        item = OrderItem.objects.get(pk=pk)
        item.status = 'READY'
        item.save()
        
        # Check if all items in order are ready
        order = item.order
        if not order.items.exclude(status__in=['READY', 'SERVED', 'CANCELLED', 'REJECTED']).exists():
            order.status = 'READY'
            order.save(update_fields=['status'])
            
        return Response(OrderItemSerializer(item).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an item from the kitchen with an optional note."""
        item = OrderItem.objects.get(pk=pk)
        item.status = 'REJECTED'
        item.rejection_note = request.data.get('note', '')
        item.save()
        
        # If all items are rejected/cancelled, we might cancel the order
        # but for now we just keep it as is.
        
        return Response(OrderItemSerializer(item).data)

class InvoiceViewSet(StoreFilterMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing invoices."""
    queryset = Invoice.objects.all().select_related('order', 'order__table', 'waiter', 'store').order_by('-created_at')
    serializer_class = InvoiceSerializer

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Generate and download a professional PDF invoice."""
        invoice = self.get_object()
        template = get_template('restaurants/invoice_pdf.html')
        context = {
            'invoice': invoice,
        }
        html = template.render(context)
        
        result = io.BytesIO()
        from xhtml2pdf import pisa
        pdf = pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), result)
        
        if not pdf.err:
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            filename = f"Invoice_{invoice.invoice_number}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        return Response({'detail': 'PDF generation failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ReportViewSet(StoreFilterMixin, viewsets.ViewSet):
    """
    Endpoints for generating various reports.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_date_range(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if start_date:
            start_date = timezone.make_aware(datetime.strptime(start_date, '%Y-%m-%d'))
        else:
            # Default to 30 days ago
            start_date = timezone.now() - timedelta(days=30)

        if end_date:
            end_date = timezone.make_aware(datetime.strptime(end_date, '%Y-%m-%d'))
            # Set to end of day
            end_date = end_date.replace(hour=23, minute=59, second=59)
        else:
            end_date = timezone.now()

        return start_date, end_date

    def _get_filtered_invoices(self, request):
        # We use StoreFilterMixin's filtering logic for Invoices
        # but since this is a ViewSet (not ModelViewSet), we manually apply it if needed
        # Actually InvoiceViewSet uses StoreFilterMixin, so we can follow that.
        store_id = self.request.headers.get('X-Store-ID')
        user = self.request.user
        
        invoices = Invoice.objects.all()
        
        if not user.is_admin:
            if hasattr(user, 'store') and user.store:
                invoices = invoices.filter(store=user.store)
        elif store_id:
            invoices = invoices.filter(store_id=store_id)
        else:
            invoices = invoices.filter(store_id=1) # Default fallback
            
        start_date, end_date = self._get_date_range(request)
        return invoices.filter(created_at__range=(start_date, end_date))

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """High-level metrics: Total Sales, Orders, AOV, Tax."""
        invoices = self._get_filtered_invoices(request)
        
        summary_data = invoices.aggregate(
            total_sales=Sum('total_amount'),
            total_orders=Count('id'),
            total_tax=Sum('tax_amount'),
            avg_order_value=Avg('total_amount')
        )
        
        # Format for JSON
        for key in summary_data:
            if summary_data[key] is None:
                summary_data[key] = 0
            if isinstance(summary_data[key], Decimal):
                summary_data[key] = float(summary_data[key])
        
        # Trend calculation (comparing to previous period could be added here)
        summary_data['currency'] = 'INR'
        
        return Response(summary_data)

    @action(detail=False, methods=['get'])
    def sales_by_type(self, request):
        """Revenue breakdown by Dine-in vs Parcel."""
        invoices = self._get_filtered_invoices(request)
        
        data = invoices.values('order__order_type').annotate(
            total_sales=Sum('total_amount'),
            order_count=Count('id')
        )
        
        # Cleanup labels
        result = []
        for item in data:
            result.append({
                'type': 'Dine-in' if item['order__order_type'] == 'DINE_IN' else 'Parcel',
                'sales': float(item['total_sales']),
                'count': item['order_count']
            })
            
        return Response(result)

    @action(detail=False, methods=['get'])
    def sales_by_payment(self, request):
        """Revenue breakdown by payment methods."""
        invoices = self._get_filtered_invoices(request)
        
        data = invoices.values('payment_method').annotate(
            total_sales=Sum('total_amount'),
            order_count=Count('id')
        )
        
        return Response([{
            'method': item['payment_method'],
            'sales': float(item['total_sales']),
            'count': item['order_count']
        } for item in data])

    @action(detail=False, methods=['get'])
    def daily_sales(self, request):
        """Time-series data for daily revenue."""
        invoices = self._get_filtered_invoices(request)
        
        data = invoices.annotate(date=TruncDate('created_at')).values('date').annotate(
            sales=Sum('total_amount'),
            count=Count('id')
        ).order_by('date')
        
        return Response([{
            'date': item['date'].strftime('%Y-%m-%d') if item['date'] else None,
            'sales': float(item['sales'] or 0),
            'count': item['count'] or 0
        } for item in data])

    @action(detail=False, methods=['get'])
    def sales_by_category(self, request):
        """Revenue breakdown by menu category."""
        # This requires joining from OrderItem back to Item and Category
        invoices = self._get_filtered_invoices(request)
        order_ids = invoices.values_list('order_id', flat=True)
        
        # Get order items for these orders
        items_data = OrderItem.objects.filter(order_id__in=order_ids).exclude(status='CANCELLED')
        
        # Aggregate by category
        data = items_data.values('item__category__name').annotate(
            sales=Sum(F('price') * F('quantity')),
            count=Sum('quantity')
        ).order_by('-sales')
        
        return Response([{
            'category': item['item__category__name'] or 'Uncategorized',
            'sales': float(item['sales'] or 0),
            'count': item['count'] or 0
        } for item in data])

    @action(detail=False, methods=['get'])
    def sales_by_item(self, request):
        """Top selling items."""
        invoices = self._get_filtered_invoices(request)
        order_ids = invoices.values_list('order_id', flat=True)
        
        items_data = OrderItem.objects.filter(order_id__in=order_ids).exclude(status='CANCELLED')
        
        # Aggregate by item
        data = items_data.values('item__name').annotate(
            sales=Sum(F('price') * F('quantity')),
            count=Sum('quantity')
        ).order_by('-sales')[:15] # Top 15
        
        return Response([{
            'item': item['item__name'],
            'sales': float(item['sales'] or 0),
            'count': item['count'] or 0
        } for item in data])

    @action(detail=False, methods=['get'])
    def tax_report(self, request):
        """Detailed tax breakdown."""
        invoices = self._get_filtered_invoices(request)
        
        data = invoices.aggregate(
            total_tax=Sum('tax_amount'),
            subtotal=Sum('subtotal'),
            total_amount=Sum('total_amount')
        )
        
        # We might want more granular breakdown if tax_details were structured differently
        # but since tax_details is a JSONField, extracting it in SQL is complex across providers.
        # For simplicity, we'll return the aggregate and maybe some sample breakdown logic if needed.
        
        summary = {
            'total_tax': float(data['total_tax'] or 0),
            'subtotal': float(data['subtotal'] or 0),
            'total_amount': float(data['total_amount'] or 0),
        }
        
        return Response(summary)
