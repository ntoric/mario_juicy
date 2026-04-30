package controllers

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/crypto/pbkdf2"
)

type LoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	var user models.User
	if err := config.DB.Preload("Store").Where("username = ?", input.Username).First(&user).Error; err != nil {
		utils.Warn("Login failed: User not found", zap.String("username", input.Username))
		utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if !CheckDjangoPassword(input.Password, user.Password) {
		utils.Warn("Login failed: Invalid password", zap.String("username", input.Username))
		utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	token, err := utils.GenerateToken(user.ID)
	if err != nil {
		utils.Error("Could not generate token", zap.Error(err), zap.Uint("userID", user.ID))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Could not generate token")
		return
	}

	utils.Info("User logged in successfully", zap.String("username", user.Username), zap.Uint("userID", user.ID))
	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"access":  token,
		"refresh": token, // Placeholder for refresh token
		"user":    user,
	})
}

type UserProfileResponse struct {
	ID           uint     `json:"id"`
	Username     string   `json:"username"`
	Email        string   `json:"email"`
	Roles        []string `json:"roles"`
	PrimaryRole  string   `json:"primary_role"`
	Permissions  []string `json:"permissions"`
	AllowedMenus []string `json:"allowed_menus"`
	FirstName    string   `json:"first_name"`
	LastName     string   `json:"last_name"`
	Store        interface{} `json:"store"`
}

func GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user models.User
	if err := config.DB.Preload("Store").Preload("Groups").First(&user, userID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found")
		return
	}

	// Fetch roles from Groups
	roles := []string{}
	for _, g := range user.Groups {
		roles = append(roles, g.Name)
	}

	if user.IsSuperuser {
		roles = append(roles, "SUPER_ADMIN")
	} else if user.IsStaff && len(roles) == 0 {
		roles = append(roles, "ADMIN")
	}

	primaryRole := "CASHIER"
	if len(roles) > 0 {
		primaryRole = roles[0]
	}

	// Replicate permissions logic (simplified)
	permissions := []string{}
	if user.IsSuperuser {
		permissions = []string{"*"}
	}

	// Allowed menus logic
	var allowedMenus []string
	if user.IsSuperuser {
		// Super Admin gets everything
		allowedMenus = []string{
			"dashboard", "table_map", "take_order", "update_table_status", "manage_tables", 
			"parcel", "reservations", "live_orders", "kitchen_display", "manage_kitchen", 
			"billing", "payment_management", "categories", "items", "reports", "stores", 
			"users", "manage_users", "delete_order", "settings", "menu_permissions",
		}
	} else {
		// Fetch from MenuPermission table for user's groups
		var groupIDs []uint
		for _, g := range user.Groups {
			groupIDs = append(groupIDs, g.ID)
		}
		
		if len(groupIDs) > 0 {
			var perms []models.MenuPermission
			config.DB.Where("group_id IN ? AND is_enabled = ?", groupIDs, true).Find(&perms)
			for _, p := range perms {
				allowedMenus = append(allowedMenus, p.MenuKey)
			}
		}
		
		// Always include dashboard for everyone
		if !contains(allowedMenus, "dashboard") {
			allowedMenus = append(allowedMenus, "dashboard")
		}
	}

	storeData := interface{}(nil)
	if user.StoreID != nil {
		storeData = gin.H{
			"id":                      user.Store.ID,
			"name":                    user.Store.Name,
			"invoice_prefix":          user.Store.InvoicePrefix,
			"is_kitchen_step_enabled": user.Store.IsKitchenStepEnabled,
			"is_take_away_enabled":    user.Store.IsTakeAwayEnabled,
			"is_reservations_enabled": user.Store.IsReservationsEnabled,
		}
	}

	resp := UserProfileResponse{
		ID:           user.ID,
		Username:     user.Username,
		Email:        user.Email,
		Roles:        roles,
		PrimaryRole:  primaryRole,
		Permissions:  permissions,
		AllowedMenus: allowedMenus,
		FirstName:    user.FirstName,
		LastName:     user.LastName,
		Store:        storeData,
	}

	utils.SuccessResponse(c, http.StatusOK, resp)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// CheckDjangoPassword verifies a raw password against a Django-style pbkdf2_sha256 hash
func CheckDjangoPassword(password, encoded string) bool {
	// Django format: pbkdf2_sha256$<iterations>$<salt>$<hash>
	parts := strings.Split(encoded, "$")
	if len(parts) != 4 {
		return false
	}

	if parts[0] != "pbkdf2_sha256" {
		return false
	}

	iterations, err := strconv.Atoi(parts[1])
	if err != nil {
		return false
	}

	salt := parts[2]
	expectedHash := parts[3]

	hash := pbkdf2.Key([]byte(password), []byte(salt), iterations, 32, sha256.New)
	actualHash := base64.StdEncoding.EncodeToString(hash)

	return actualHash == expectedHash
}

func HashDjangoPassword(password string) string {
	salt := "mario" + strconv.FormatInt(time.Now().Unix(), 10) // Simple salt for now
	iterations := 320000
	hash := pbkdf2.Key([]byte(password), []byte(salt), iterations, 32, sha256.New)
	actualHash := base64.StdEncoding.EncodeToString(hash)
	return fmt.Sprintf("pbkdf2_sha256$%d$%s$%s", iterations, salt, actualHash)
}

func GetUsers(c *gin.Context) {
	var users []models.User
	config.DB.Preload("Store").Preload("Groups").Find(&users)

	var response []gin.H
	for _, u := range users {
		groups := []string{}
		for _, g := range u.Groups {
			groups = append(groups, g.Name)
		}

		if u.IsSuperuser && !contains(groups, "SUPER_ADMIN") {
			groups = append(groups, "SUPER_ADMIN")
		}

		var storeData interface{}
		if u.StoreID != nil {
			storeData = gin.H{
				"id":             u.Store.ID,
				"name":           u.Store.Name,
				"invoice_prefix": u.Store.InvoicePrefix,
			}
		}

		response = append(response, gin.H{
			"id":        u.ID,
			"username":  u.Username,
			"email":     u.Email,
			"is_active": u.IsActive,
			"groups":    groups,
			"store":     storeData,
		})
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

func CreateUser(c *gin.Context) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Email    string `json:"email"`
		Role     string `json:"role"`
		StoreID  *uint  `json:"store"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	user := models.User{
		Username:  input.Username,
		Email:     input.Email,
		Password:  HashDjangoPassword(input.Password),
		StoreID:   input.StoreID,
		IsActive:  true,
		DateJoined: time.Now(),
	}

	if err := config.DB.Create(&user).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Assign group based on role
	if input.Role != "" {
		var group models.Group
		if err := config.DB.Where("name = ?", input.Role).First(&group).Error; err == nil {
			config.DB.Exec("INSERT INTO users_user_groups (user_id, group_id) VALUES (?, ?)", user.ID, group.ID)
		}
	}

	utils.SuccessResponse(c, http.StatusCreated, user)
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found")
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Manual update to avoid GORM zero-value issues
	if val, ok := input["username"]; ok { user.Username = val.(string) }
	if val, ok := input["email"]; ok { user.Email = val.(string) }
	if val, ok := input["is_active"]; ok { user.IsActive = val.(bool) }
	if val, ok := input["password"]; ok && val != "" {
		user.Password = HashDjangoPassword(val.(string))
	}
	if val, ok := input["store"]; ok && val != nil {
		storeID := uint(val.(float64))
		user.StoreID = &storeID
	}

	config.DB.Save(&user)

	// Update role if provided
	if val, ok := input["role"]; ok {
		role := val.(string)
		var group models.Group
		if err := config.DB.Where("name = ?", role).First(&group).Error; err == nil {
			config.DB.Exec("DELETE FROM users_user_groups WHERE user_id = ?", user.ID)
			config.DB.Exec("INSERT INTO users_user_groups (user_id, group_id) VALUES (?, ?)", user.ID, group.ID)
		}
	}

	utils.SuccessResponse(c, http.StatusOK, user)
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.User{}, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "User deleted"})
}

func GetGroups(c *gin.Context) {
	var groups []models.Group
	config.DB.Find(&groups)
	utils.SuccessResponse(c, http.StatusOK, groups)
}

func GetMenuPermissions(c *gin.Context) {
	var perms []models.MenuPermission
	groupID := c.Query("group")
	query := config.DB.Model(&models.MenuPermission{})
	if groupID != "" {
		query = query.Where("group_id = ?", groupID)
	}
	query.Find(&perms)
	utils.SuccessResponse(c, http.StatusOK, perms)
}

func CreateMenuPermission(c *gin.Context) {
	var perm models.MenuPermission
	if err := c.ShouldBindJSON(&perm); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := config.DB.Create(&perm).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, perm)
}

func UpdateMenuPermission(c *gin.Context) {
	id := c.Param("id")
	var perm models.MenuPermission
	if err := config.DB.First(&perm, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Permission not found")
		return
	}
	if err := c.ShouldBindJSON(&perm); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	config.DB.Save(&perm)
	utils.SuccessResponse(c, http.StatusOK, perm)
}
