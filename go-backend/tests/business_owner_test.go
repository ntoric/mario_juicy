package tests

import (
	"encoding/json"
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/routes"
	"mario-backend/utils"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestBusinessOwnerPermissions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	config.LoadConfig()
	config.ConnectDatabase()
	
	// Setup router
	r := gin.Default()
	routes.SetupRoutes(r, nil)

	// 1. Create a Business Owner user
	var boRole models.Group
	config.DB.Where("name = ?", "BUSINESS_OWNER").First(&boRole)
	
	boUser := models.User{
		Username: "business_owner_test",
		Password: "password123",
		IsActive: true,
		Groups:   []models.Group{boRole},
	}
	config.DB.Create(&boUser)
	defer config.DB.Delete(&boUser)

	token, _ := utils.GenerateToken(boUser.ID)

	// 2. Test GetProfile - Verify allowed menus
	req, _ := http.NewRequest("GET", "/api/users/profile/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var profileResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &profileResp)
	
	data := profileResp["data"].(map[string]interface{})
	allowedMenus := data["allowed_menus"].([]interface{})
	
	menuSet := make(map[string]bool)
	for _, m := range allowedMenus {
		menuSet[m.(string)] = true
	}
	
	assert.True(t, menuSet["business_statistics"])
	assert.True(t, menuSet["store_sales_reports"])
	assert.False(t, menuSet["store_settings"]) // Should NOT have store_settings (reserved for Admin/Cashier or Super Admin)

	// 3. Test GetUsers - Should NOT see Super Admins
	// Create a temporary super admin
	saUser := models.User{
		Username:    "temp_sa",
		IsSuperuser: true,
	}
	config.DB.Create(&saUser)
	defer config.DB.Delete(&saUser)

	req, _ = http.NewRequest("GET", "/api/users/management/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Store-ID", "1")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var usersResp []map[string]interface{}
	// SuccessResponse wrapper
	var wrapper map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &wrapper)
	usersData, _ := json.Marshal(wrapper["data"])
	json.Unmarshal(usersData, &usersResp)

	foundSA := false
	for _, u := range usersResp {
		if u["username"] == "temp_sa" {
			foundSA = true
			break
		}
	}
	assert.False(t, foundSA, "Business Owner should not see Super Admins")

	// 4. Test Cross-store report access
	req, _ = http.NewRequest("GET", "/api/reports/business-statistics/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Store-ID", "2") // Access another store
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}
