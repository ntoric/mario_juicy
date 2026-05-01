package tests

import (
	"mario-backend/config"
	"mario-backend/controllers"
	"mario-backend/models"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestGetSupportSettings(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Setup memory DB
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	db.AutoMigrate(&models.SupportSettings{})
	
	// Create test support settings
	testSettings := models.SupportSettings{
		Email: "test@support.com",
		Phone: "+91 1234567890",
	}
	db.Create(&testSettings)
	
	config.DB = db

	t.Run("Returns support settings successfully", func(t *testing.T) {
		r := gin.New()
		r.GET("/api/support/", controllers.GetSupportSettings)

		req, _ := http.NewRequest("GET", "/api/support/", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "test@support.com")
		assert.Contains(t, w.Body.String(), "+91 1234567890")
	})
}
