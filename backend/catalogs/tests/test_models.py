from django.test import TestCase
from catalogs.models import Category

class CategoryModelTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name="Electronics",
            is_enabled=True
        )

    def test_category_creation(self):
        """Test that a category is created correctly."""
        self.assertEqual(self.category.name, "Electronics")
        self.assertTrue(self.category.is_enabled)
        self.assertIsNotNone(self.category.created_at)
        self.assertIsNotNone(self.category.updated_at)

    def test_category_str_representation(self):
        """Test the string representation of the category."""
        self.assertEqual(str(self.category), "Electronics")

    def test_category_name_uniqueness(self):
        """Test that category names must be unique."""
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Category.objects.create(name="Electronics")
