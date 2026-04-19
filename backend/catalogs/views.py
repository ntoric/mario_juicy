from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Category, Item
from .serializers import CategorySerializer, ItemSerializer
from core.mixins import StoreFilterMixin

class CategoryViewSet(StoreFilterMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.DjangoModelPermissions]

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        category = self.get_object()
        category.is_enabled = not category.is_enabled
        category.save()
        return Response({
            'status': 'success',
            'is_enabled': category.is_enabled
        })

class ItemViewSet(StoreFilterMixin, viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        item = self.get_object()
        item.is_enabled = not item.is_enabled
        item.save()
        return Response({
            'status': 'success',
            'is_enabled': item.is_enabled
        })
