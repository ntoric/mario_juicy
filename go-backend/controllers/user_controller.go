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
	"math/rand"
)

func generateRandomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

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
		"must_change_password": user.MustChangePassword,
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
	MustChangePassword bool `json:"must_change_password"`
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
	} else {
		// Fetch permissions from auth_permission table
		config.DB.Raw(`
			SELECT DISTINCT ct.app_label || '.' || p.codename
			FROM auth_permission p
			JOIN django_content_type ct ON ct.id = p.content_type_id
			JOIN auth_group_permissions gp ON gp.permission_id = p.id
			JOIN users_user_groups ug ON ug.group_id = gp.group_id
			WHERE ug.user_id = ?
			UNION
			SELECT DISTINCT ct.app_label || '.' || p.codename
			FROM auth_permission p
			JOIN django_content_type ct ON ct.id = p.content_type_id
			JOIN users_user_user_permissions up ON up.permission_id = p.id
			WHERE up.user_id = ?
		`, user.ID, user.ID).Scan(&permissions)
	}

	// Allowed menus logic
	var allowedMenus []string
	if user.IsSuperuser || contains(roles, "SUPER_ADMIN") {
		// Super Admin gets everything
		allowedMenus = []string{
			"dashboard", "parcel_order", "billing", "reservation", "live_order",
			"users_management", "store_settings", "tables_access", "table_layout",
			"categories", "items", "reports", "stores", "support",
		}
	} else if contains(roles, "BUSINESS_OWNER") {
		allowedMenus = []string{
			"dashboard", "reports", "stores", "users_management",
			"categories", "items", "business_statistics",
			"store_sales_reports", "store_top_items_reports", "support",
		}
	} else if contains(roles, "ADMIN") {
		// Admin gets everything except global store management and super-admin specific stuff
		allowedMenus = []string{
			"dashboard", "parcel_order", "billing", "reservation", "live_order",
			"users_management", "store_settings", "tables_access", "table_layout",
			"categories", "items", "reports", "support",
		}
	} else if contains(roles, "MANAGER") {
		// Manager: All admin access except report, business settings, user management
		allowedMenus = []string{
			"dashboard", "parcel_order", "billing", "reservation", "live_order",
			"tables_access", "table_layout", "categories", "items", "support",
		}
	} else if contains(roles, "CASHIER") {
		// Cashier: billing, categories, items, orders, parcel, reservation, kitchen, and business settings
		allowedMenus = []string{
			"dashboard", "parcel_order", "billing", "reservation", "live_order",
			"categories", "items", "store_settings", "support",
		}
	} else if contains(roles, "STAFF") {
		// Staff: Floor Layout, Parcel, Kitchen, Reservation, orders
		allowedMenus = []string{
			"dashboard", "tables_access", "table_layout", "parcel_order", "reservation", "live_order", "support",
		}
	} else {
		// Default fallback
		allowedMenus = []string{"dashboard", "support"}
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
		MustChangePassword: user.MustChangePassword,
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
	activeStoreID, _ := c.Get("active_store_id")
	queryStoreID := c.Query("store_id")
	
	var storeID interface{}
	if queryStoreID != "" && queryStoreID != "all" {
		id, _ := strconv.ParseUint(queryStoreID, 10, 32)
		storeID = uint(id)
	} else {
		storeID = activeStoreID
	}
	
	query := config.DB.Preload("Store").Preload("Groups")
	
	// Get current user role
	currentUser, _ := c.Get("user")
	userRoles := []string{}
	isSuperUser := false
	if currentUser != nil {
		userObj := currentUser.(models.User)
		isSuperUser = userObj.IsSuperuser
		for _, g := range userObj.Groups {
			userRoles = append(userRoles, g.Name)
		}
	}

	if storeID != nil && storeID.(uint) != 0 {
		isBusinessOwner := contains(userRoles, "BUSINESS_OWNER")
		if isSuperUser || isBusinessOwner {
			// Global users see store users + global users (Super Admin, Business Owner)
			query = query.Where("store_id = ? OR is_superuser = ? OR id IN (SELECT user_id FROM users_user_groups JOIN auth_group ON auth_group.id = users_user_groups.group_id WHERE auth_group.name IN (?))", 
				storeID, true, []string{"SUPER_ADMIN", "BUSINESS_OWNER"})
		} else {
			query = query.Where("store_id = ?", storeID)
		}
	}

	// Filter super admins for BUSINESS_OWNER

	if contains(userRoles, "BUSINESS_OWNER") {
		// Exclude superusers and users in SUPER_ADMIN group
		query = query.Where("is_superuser = ?", false).
			Where("id NOT IN (SELECT user_id FROM users_user_groups JOIN auth_group ON auth_group.id = users_user_groups.group_id WHERE auth_group.name = ?)", "SUPER_ADMIN")
	}

	query.Find(&users)

	response := make([]gin.H, 0)
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

	// Enforce store ID for non-superusers
	storeID, _ := c.Get("active_store_id")
	isSuperuser, _ := c.Get("is_superuser")
	currentUser, _ := c.Get("user")
	userRoles := []string{}
	if currentUser != nil {
		for _, g := range currentUser.(models.User).Groups {
			userRoles = append(userRoles, g.Name)
		}
	}

	if isSuperuser == false && storeID != nil {
		sid := storeID.(uint)
		input.StoreID = &sid
	}

	// Generate temporary password
	tempPassword := generateRandomString(10)

	user := models.User{
		Username:           input.Username,
		Email:              input.Email,
		Password:           HashDjangoPassword(tempPassword),
		StoreID:            input.StoreID,
		IsActive:           true,
		DateJoined:         time.Now(),
		MustChangePassword: true,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Assign group based on role
	if input.Role != "" {
		// BUSINESS_OWNER cannot assign SUPER_ADMIN role
		if contains(userRoles, "BUSINESS_OWNER") && input.Role == "SUPER_ADMIN" {
			utils.ErrorResponse(c, http.StatusForbidden, "Business Owners cannot create Super Admins")
			return
		}

		var group models.Group
		if err := config.DB.Where("name = ?", input.Role).First(&group).Error; err == nil {
			config.DB.Exec("INSERT INTO users_user_groups (user_id, group_id) VALUES (?, ?)", user.ID, group.ID)
		}
	}

	utils.SuccessResponse(c, http.StatusCreated, gin.H{
		"user":               user,
		"temporary_password": tempPassword,
	})
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	activeStoreID, _ := c.Get("active_store_id")
	isSuperuser, _ := c.Get("is_superuser")

	query := config.DB
	if isSuperuser == false && activeStoreID != nil {
		query = query.Where("store_id = ?", activeStoreID)
	}

	if err := query.First(&user, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found or access denied")
		return
	}

	// BUSINESS_OWNER cannot modify SUPER_ADMIN
	currentUser, _ := c.Get("user")
	userRoles := []string{}
	if currentUser != nil {
		for _, g := range currentUser.(models.User).Groups {
			userRoles = append(userRoles, g.Name)
		}
	}

	if contains(userRoles, "BUSINESS_OWNER") && (user.IsSuperuser || contains(userRoles, "SUPER_ADMIN")) {
		utils.ErrorResponse(c, http.StatusForbidden, "Business Owners cannot modify Super Admins")
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
		// Only superuser can change store
		if isSuperuser == true {
			user.StoreID = &storeID
		}
	}

	config.DB.Save(&user)

	// Update role if provided
	if val, ok := input["role"]; ok {
		role := val.(string)

		// BUSINESS_OWNER cannot assign SUPER_ADMIN role
		if contains(userRoles, "BUSINESS_OWNER") && role == "SUPER_ADMIN" {
			utils.ErrorResponse(c, http.StatusForbidden, "Business Owners cannot assign Super Admin role")
			return
		}

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
	activeStoreID, _ := c.Get("active_store_id")
	isSuperuser, _ := c.Get("is_superuser")

	query := config.DB.Model(&models.User{})
	if isSuperuser == false && activeStoreID != nil {
		query = query.Where("store_id = ?", activeStoreID)
	}

	if err := query.Delete(&models.User{}, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete user or access denied")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func GetGroups(c *gin.Context) {
	var groups []models.Group
	config.DB.Find(&groups)
	utils.SuccessResponse(c, http.StatusOK, groups)
}

func ResetPassword(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found")
		return
	}

	tempPassword := generateRandomString(10)
	user.Password = HashDjangoPassword(tempPassword)
	user.MustChangePassword = true
	config.DB.Save(&user)

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"message":            "Password reset successfully",
		"temporary_password": tempPassword,
	})
}

func ChangePassword(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var input struct {
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "User not found")
		return
	}

	user.Password = HashDjangoPassword(input.NewPassword)
	user.MustChangePassword = false
	config.DB.Save(&user)

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Password updated successfully"})
}

