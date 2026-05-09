package controllers

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetNotifications(c *gin.Context) {
	var notifications []models.Notification
	storeIDRaw, _ := c.Get("active_store_id")
	userIDRaw, _ := c.Get("user_id")

	storeID := storeIDRaw.(uint)
	userID := userIDRaw.(uint)

	query := config.DB.Where("store_id = ?", storeID).
		Where("(user_id IS NULL OR user_id = ?)", userID).
		Order("created_at DESC").
		Limit(50)

	if err := query.Find(&notifications).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to fetch notifications")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, notifications)
}

func MarkNotificationAsRead(c *gin.Context) {
	id := c.Param("id")
	storeIDRaw, _ := c.Get("active_store_id")
	storeID := storeIDRaw.(uint)

	var notification models.Notification
	if err := config.DB.Where("id = ? AND store_id = ?", id, storeID).First(&notification).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Notification not found")
		return
	}

	notification.IsRead = true
	config.DB.Save(&notification)

	utils.SuccessResponse(c, http.StatusOK, notification)
}

func MarkAllNotificationsAsRead(c *gin.Context) {
	storeIDRaw, _ := c.Get("active_store_id")
	userIDRaw, _ := c.Get("user_id")

	storeID := storeIDRaw.(uint)
	userID := userIDRaw.(uint)

	if err := config.DB.Model(&models.Notification{}).
		Where("store_id = ? AND (user_id IS NULL OR user_id = ?) AND is_read = ?", storeID, userID, false).
		Update("is_read", true).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update notifications")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "All notifications marked as read"})
}
