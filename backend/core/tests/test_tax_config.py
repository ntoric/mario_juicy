import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from core.models import TaxConfiguration

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def tax_config():
    return TaxConfiguration.get_solo()

@pytest.mark.django_db
class TestTaxConfiguration:
    def test_get_tax_config(self, api_client, tax_config):
        url = reverse('tax-configuration-list')
        # Since it's a singleton-like view, list returns the single object
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == tax_config.name

    def test_update_tax_config(self, api_client, tax_config):
        url = reverse('tax-configuration-detail', kwargs={'pk': tax_config.id})
        data = {
            'tax_type': 'INCLUSIVE',
            'is_gst_enabled': True,
            'cgst_rate': '9.00',
            'sgst_rate': '9.00'
        }
        response = api_client.patch(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        tax_config.refresh_from_db()
        assert tax_config.tax_type == 'INCLUSIVE'
        assert tax_config.is_gst_enabled is True
        assert tax_config.cgst_rate == 9.00
