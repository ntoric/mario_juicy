package tests

import (
	"mario-backend/models"
	"mario-backend/services"
	"os"
	"testing"
	"time"
	"mario-backend/config"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"mario-backend/utils"
)

func TestCleanupOldData(t *testing.T) {
	utils.InitializeLogger()
	
	// Use SQLite in-memory for testing
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	config.DB = db
	
	// Ensure tables exist
	config.DB.AutoMigrate(&models.Store{}, &models.Order{}, &models.Invoice{})

	// Setup: Create a store
	store := models.Store{Name: "Test Cleanup Store"}
	config.DB.Create(&store)

	// Set retention days to 1 for testing
	os.Setenv("DATA_RETENTION_DAYS", "1")
	defer os.Unsetenv("DATA_RETENTION_DAYS")

	// Create an old order (2 days ago)
	oldDate := time.Now().AddDate(0, 0, -2)
	oldOrder := models.Order{
		StoreID:      &store.ID,
		Status:       "COMPLETED",
		CreatedAt:    oldDate,
		TotalAmount:  100.0,
	}
	config.DB.Create(&oldOrder)
	
	// Create an old invoice for that order
	oldInvoice := models.Invoice{
		OrderID:       oldOrder.ID,
		StoreID:       &store.ID,
		InvoiceNumber: "OLD-INV-001",
		TotalAmount:   100.0,
		CreatedAt:     oldDate,
	}
	config.DB.Create(&oldInvoice)

	// Create a recent order (now)
	recentOrder := models.Order{
		StoreID:      &store.ID,
		Status:       "COMPLETED",
		CreatedAt:    time.Now(),
		TotalAmount:  200.0,
	}
	config.DB.Create(&recentOrder)
	
	// Create a recent invoice
	recentInvoice := models.Invoice{
		OrderID:       recentOrder.ID,
		StoreID:       &store.ID,
		InvoiceNumber: "REC-INV-001",
		TotalAmount:   200.0,
		CreatedAt:     time.Now(),
	}
	config.DB.Create(&recentInvoice)

	// Run Cleanup
	services.CleanupOldData()

	// Verify old data is deleted
	var count int64
	config.DB.Model(&models.Order{}).Where("id = ?", oldOrder.ID).Count(&count)
	assert.Equal(t, int64(0), count, "Old order should be deleted")

	config.DB.Model(&models.Invoice{}).Where("id = ?", oldInvoice.ID).Count(&count)
	assert.Equal(t, int64(0), count, "Old invoice should be deleted")

	// Verify recent data remains
	config.DB.Model(&models.Order{}).Where("id = ?", recentOrder.ID).Count(&count)
	assert.Equal(t, int64(1), count, "Recent order should NOT be deleted")

	config.DB.Model(&models.Invoice{}).Where("id = ?", recentInvoice.ID).Count(&count)
	assert.Equal(t, int64(1), count, "Recent invoice should NOT be deleted")

	// Cleanup test data
	config.DB.Unscoped().Delete(&recentOrder)
	config.DB.Unscoped().Delete(&recentInvoice)
	config.DB.Unscoped().Delete(&store)
}
