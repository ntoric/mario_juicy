from django.test import TestCase
from catalogs.models import Category
from catalogs.serializers import CategorySerializer

class CategorySerializerTest(TestCase):
    def setUp(self):
        self.category_attributes = {
            'name': 'Groceries',
            'is_enabled': True
        }
        self.category = Category.objects.create(**self.category_attributes)
        self.serializer = CategorySerializer(instance=self.category)

    def test_contains_expected_fields(self):
        """Test that the serializer contains all expected fields."""
        data = self.serializer.data
        self.assertEqual(set(data.keys()), set(['id', 'name', 'image', 'is_enabled', 'created_at', 'updated_at']))

    def test_name_field_content(self):
        """Test that the name field matches the expected value."""
        data = self.serializer.data
        self.assertEqual(data['name'], self.category_attributes['name'])

    def test_serializer_validation(self):
        """Test that the serializer correctly validates data."""
        invalid_data = {'name': ''} # Blank name is invalid
        serializer = CategorySerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
        
        valid_data = {'name': 'New Category'}
        serializer = CategorySerializer(data=valid_data)
        self.assertTrue(serializer.is_valid())
