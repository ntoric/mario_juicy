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

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
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

		var roles []string
		for _, g := range user.Groups {
			roles = append(roles, g.Name)
		}

		var allowedMenus []string
		if contains(roles, "SUPER_ADMIN") {
			allowedMenus = []string{
				"dashboard", "parcel_order", "billing", "reservation", "live_order",
				"users_management", "store_settings", "tables_access", "table_layout",
				"categories", "items", "reports", "stores", "subscription", "support",
			}
		} else if contains(roles, "ADMIN") {
			allowedMenus = []string{
				"dashboard", "parcel_order", "billing", "reservation", "live_order",
				"users_management", "store_settings", "tables_access", "table_layout",
				"categories", "items", "reports", "support", "subscription",
			}
		} else if contains(roles, "MANAGER") {
			allowedMenus = []string{
				"dashboard", "parcel_order", "billing", "reservation", "live_order",
				"tables_access", "table_layout", "categories", "items", "support",
			}
		} else if contains(roles, "CASHIER") {
			allowedMenus = []string{
				"dashboard", "parcel_order", "billing", "reservation", "live_order",
				"categories", "items", "store_settings", "support",
			}
		} else if contains(roles, "STAFF") {
			allowedMenus = []string{
				"dashboard", "tables_access", "table_layout", "parcel_order", "reservation", "live_order", "support",
			}
		} else {
			allowedMenus = []string{"dashboard", "support"}
		}

		for _, key := range allowedMenus {
			if key == menuKey {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to perform this action: " + menuKey})
		c.Abort()
	}
}
