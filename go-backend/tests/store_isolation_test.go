package tests

import (
	"mario-backend/config"
	"mario-backend/middleware"
	"mario-backend/models"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB() {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	db.AutoMigrate(&models.Store{}, &models.User{})
	
	// Create some stores
	db.Create(&models.Store{ID: 1, Name: "Store 1", IsActive: true})
	db.Create(&models.Store{ID: 2, Name: "Store 2", IsActive: true})
	
	store3 := models.Store{ID: 3, Name: "Store 3"}
	db.Create(&store3)
	db.Model(&store3).Update("is_active", false)
	
	config.DB = db
}

func TestStoreMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupTestDB()

	t.Run("Superuser can switch stores", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			user := models.User{
				IsSuperuser: true,
			}
			user.ID = 1
			c.Set("user", user)
			c.Next()
		})
		r.Use(middleware.StoreMiddleware())
		r.GET("/test", func(c *gin.Context) {
			storeID, _ := c.Get("active_store_id")
			c.JSON(http.StatusOK, gin.H{"active_store_id": storeID})
		})

		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("X-Store-ID", "2")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), `"active_store_id":2`)
	})

	t.Run("Non-superuser is locked to their store", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			storeID := uint(1)
			user := models.User{
				IsSuperuser: false,
				StoreID:     &storeID,
			}
			user.ID = 2
			c.Set("user", user)
			c.Next()
		})
		r.Use(middleware.StoreMiddleware())
		r.GET("/test", func(c *gin.Context) {
			storeID, _ := c.Get("active_store_id")
			c.JSON(http.StatusOK, gin.H{"active_store_id": storeID})
		})

		// Try to access store 2
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("X-Store-ID", "2")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		// Should be Forbidden
		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("Accessing inactive store as non-superuser", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			storeID := uint(3)
			user := models.User{
				IsSuperuser: false,
				StoreID:     &storeID,
			}
			user.ID = 3
			c.Set("user", user)
			c.Next()
		})
		r.Use(middleware.StoreMiddleware())
		r.GET("/test", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		req, _ := http.NewRequest("GET", "/test", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.Contains(t, w.Body.String(), "inactive")
	})
}
