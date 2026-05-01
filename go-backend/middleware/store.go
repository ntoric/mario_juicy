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
		} else if !user.IsSuperuser {
			c.JSON(http.StatusForbidden, gin.H{"error": "User is not assigned to any store"})
			c.Abort()
			return
		}

		// Validation logic
		if !user.IsSuperuser {
			// If not superuser, they can ONLY access their own store
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

			if !store.IsActive && !user.IsSuperuser {
				// Special case: Allow GET /api/stores/:id/ to return store info even if inactive
				// so the frontend can display the inactivity message and redirect to support.
				isStoreGet := c.Request.Method == "GET" && (c.FullPath() == "/api/stores/:id/" || c.FullPath() == "/api/stores/:id")
				
				if !isStoreGet {
					c.JSON(http.StatusForbidden, gin.H{
						"error": "Store is currently inactive. Please contact support.",
						"status": "INACTIVE",
					})
					c.Abort()
					return
				}
			}
			c.Set("active_store", store)
		}

		c.Set("active_store_id", requestedStoreID)
		c.Next()
	}
}
