package middleware

import (
	"mario-backend/config"
	"mario-backend/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func StoreMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user from context (set by AuthMiddleware)
		userObj, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}
		user := userObj.(models.User)

		// Get store ID from header
		storeIDStr := c.GetHeader("X-Store-ID")
		var requestedStoreID uint

		// Validation logic
		isBusinessOwner := false
		for _, g := range user.Groups {
			if g.Name == "BUSINESS_OWNER" {
				isBusinessOwner = true
				break
			}
		}

		if storeIDStr != "" {
			sid, err := strconv.ParseUint(storeIDStr, 10, 32)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Store ID"})
				c.Abort()
				return
			}
			requestedStoreID = uint(sid)
		} else if user.StoreID != nil {
			requestedStoreID = *user.StoreID
		} else if !user.IsSuperuser && !isBusinessOwner {
			c.JSON(http.StatusForbidden, gin.H{"error": "User is not assigned to any store"})
			c.Abort()
			return
		}

		if !user.IsSuperuser && !isBusinessOwner {
			// If not superuser or business owner, they can ONLY access their own store
			if user.StoreID == nil || *user.StoreID != requestedStoreID {
				c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this store"})
				c.Abort()
				return
			}
		}

		// Check if store is active
		var store models.Store
		if requestedStoreID > 0 {
			if err := config.DB.First(&store, requestedStoreID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Store not found"})
				c.Abort()
				return
			}

			if !store.IsActive && !user.IsSuperuser && !isBusinessOwner {
				c.JSON(http.StatusForbidden, gin.H{
					"error": "Store is currently inactive. Please contact support.",
					"status": "INACTIVE",
				})
				c.Abort()
				return
			}
			c.Set("active_store", store)
		}

		c.Set("active_store_id", requestedStoreID)
		c.Next()
	}
}
