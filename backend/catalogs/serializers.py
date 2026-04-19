from rest_framework import serializers
from .models import Category, Item

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'image', 'is_enabled', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Item
        fields = ['id', 'category', 'category_name', 'code', 'name', 'image', 'description', 'price', 'is_enabled', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'category_name']
