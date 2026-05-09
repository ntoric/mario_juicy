package services

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/websocket"
)

func CreateNotification(storeID uint, userID *uint, title, message, nType, link string) {
	notification := models.Notification{
		StoreID: storeID,
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    nType,
		Link:    link,
	}

	if err := config.DB.Create(&notification).Error; err == nil {
		// Broadcast via websocket
		// Note: We are broadcasting to all, frontend should filter or refetch
		websocket.Broadcast("NEW_NOTIFICATION", notification)
	}
}

