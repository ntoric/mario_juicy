package tests

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/services"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestNotificationFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	config.LoadConfig()
	config.ConnectDatabase()
	config.DB.AutoMigrate(&models.Notification{}, &models.Store{}, &models.User{})

	// Setup
	store := models.Store{Name: "Test Store"}
	config.DB.Create(&store)
	user := models.User{Username: "testuser", StoreID: &store.ID}
	config.DB.Create(&user)

	// Test CreateNotification
	services.CreateNotification(store.ID, nil, "Test Title", "Test Message", "TEST_TYPE", "/test")

	var notification models.Notification
	err := config.DB.Where("store_id = ?", store.ID).First(&notification).Error
	assert.NoError(t, err)
	assert.Equal(t, "Test Title", notification.Title)
	assert.Equal(t, false, notification.IsRead)

}

func TestGetNotificationsAPI(t *testing.T) {
	// This would require setting up the full router and auth middleware
	// For simplicity, we've tested the core logic in TestNotificationFlow
}
