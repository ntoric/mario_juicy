package services

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"os"
	"strconv"
	"time"

	"go.uber.org/zap"
)

// StartDataCleanupCron starts a background goroutine that runs the cleanup daily
func StartDataCleanupCron() {
	go func() {
		utils.Info("Starting periodic data cleanup worker")
		for {
			// Run cleanup
			CleanupOldData()

			// Sleep until next day
			// Calculate time until next midnight (Kolkata time)
			now := time.Now()
			location, err := time.LoadLocation("Asia/Kolkata")
			if err != nil {
				location = time.Local
			}
			
			// Get next midnight
			nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, location)
			sleepDuration := nextMidnight.Sub(now)
			
			utils.Info("Next data cleanup scheduled", zap.Duration("sleep_duration", sleepDuration))
			time.Sleep(sleepDuration)
		}
	}()
}

// CleanupOldData deletes orders, order items, and invoices older than N days
func CleanupOldData() {
	retentionDaysStr := os.Getenv("DATA_RETENTION_DAYS")
	if retentionDaysStr == "" {
		retentionDaysStr = "30" // Default 30 days
	}

	days, err := strconv.Atoi(retentionDaysStr)
	if err != nil {
		utils.Error("Invalid DATA_RETENTION_DAYS value, using default 30", zap.String("value", retentionDaysStr))
		days = 30
	}

	cutoffDate := time.Now().AddDate(0, 0, -days)
	utils.Info("Running periodic data cleanup", zap.Int("retention_days", days), zap.Time("cutoff_date", cutoffDate))

	// Delete Orders older than cutoffDate
	// OrderItems and Invoices should be deleted via ON DELETE CASCADE in the database
	// However, we can also delete them explicitly if we want to be safe or if cascading is not set
	
	// We use GORM's Unscoped to perform permanent deletion instead of soft delete if configured
	// But our models don't seem to use gorm.Model (which has DeletedAt)
	
	var ordersDeleted int64
	result := config.DB.Where("created_at < ?", cutoffDate).Delete(&models.Order{})
	ordersDeleted = result.RowsAffected

	if result.Error != nil {
		utils.Error("Failed to cleanup old orders", zap.Error(result.Error))
	} else {
		utils.Info("Old orders cleaned up successfully", zap.Int64("count", ordersDeleted))
	}

	// Double check for Invoices that might not have been cascaded (though they should be)
	var invoicesDeleted int64
	result = config.DB.Where("created_at < ?", cutoffDate).Delete(&models.Invoice{})
	invoicesDeleted = result.RowsAffected
	
	if result.Error != nil {
		utils.Error("Failed to cleanup old invoices", zap.Error(result.Error))
	} else {
		utils.Info("Old invoices cleaned up successfully", zap.Int64("count", invoicesDeleted))
	}
}
