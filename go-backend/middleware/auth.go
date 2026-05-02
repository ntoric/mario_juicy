package middleware

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Fetch full user and store details
		var user models.User
		if err := config.DB.Preload("Store").Preload("Groups").Where("id = ?", claims.UserID).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "User account is inactive"})
			c.Abort()
			return
		}

		c.Set("user_id", user.ID)
		c.Set("user", user)
		if user.StoreID != nil {
			c.Set("user_store_id", *user.StoreID)
		}
		c.Set("is_superuser", user.IsSuperuser)

		c.Next()
	}
}

func SuperuserMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		isSuperuser, exists := c.Get("is_superuser")
		if !exists || isSuperuser == false {
			c.JSON(http.StatusForbidden, gin.H{"error": "Superuser access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func PermissionMiddleware(menuKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		isSuperuser, exists := c.Get("is_superuser")
		if exists && isSuperuser == true {
			c.Next()
			return
		}

		userObj, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}
		user := userObj.(models.User)

		// Fetch user groups with their IDs
		var groupIDs []uint
		for _, g := range user.Groups {
			groupIDs = append(groupIDs, g.ID)
		}

		if len(groupIDs) > 0 {
			var count int64
			config.DB.Model(&models.MenuPermission{}).
				Where("group_id IN ? AND menu_key = ? AND is_enabled = ?", groupIDs, menuKey, true).
				Count(&count)
			if count > 0 {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to perform this action: " + menuKey})
		c.Abort()
	}
}
