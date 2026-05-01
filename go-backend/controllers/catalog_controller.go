package controllers

import (
	"fmt"
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"path/filepath"
	"strconv"
	"time"
)

type CategoryResponse struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Image     string    `json:"image"`
	IsEnabled bool      `json:"is_enabled"`
	CreatedAt string    `json:"created_at"`
	UpdatedAt string    `json:"updated_at"`
}

func GetCategories(c *gin.Context) {
	var categories []models.Category
	storeID, _ := c.Get("active_store_id")
	utils.Debug("Fetching categories", zap.Any("storeID", storeID))
	query := config.DB
	if storeID != nil {
		query = query.Where("store_id = ?", storeID)
	}
	if err := query.Find(&categories).Error; err != nil {
		utils.Error("Failed to fetch categories", zap.Error(err), zap.Any("storeID", storeID))
	}
	
	response := []CategoryResponse{}
	for _, cat := range categories {
		response = append(response, CategoryResponse{
			ID:        cat.ID,
			Name:      cat.Name,
			Image:     cat.Image,
			IsEnabled: cat.IsEnabled,
			CreatedAt: cat.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
			UpdatedAt: cat.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		})
	}
	utils.SuccessResponse(c, http.StatusOK, response)
}

type ItemResponse struct {
	ID           uint      `json:"id"`
	Category     *uint     `json:"category"`
	CategoryName string    `json:"category_name"`
	Code         string    `json:"code"`
	Name         string    `json:"name"`
	Image        string    `json:"image"`
	Description  string    `json:"description"`
	Price        string    `json:"price"`
	IsEnabled    bool      `json:"is_enabled"`
	CreatedAt    string    `json:"created_at"`
	UpdatedAt    string    `json:"updated_at"`
}

func GetItems(c *gin.Context) {
	var items []models.Item
	storeID, _ := c.Get("active_store_id")
	categoryID := c.Query("category_id")
	utils.Debug("Fetching items", zap.Any("storeID", storeID), zap.String("categoryID", categoryID))
	query := config.DB.Preload("Category")
	if storeID != nil {
		query = query.Where("store_id = ?", storeID)
	}
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	query.Find(&items)

	response := []ItemResponse{}
	for _, i := range items {
		catName := ""
		if i.Category.ID != 0 {
			catName = i.Category.Name
		}
		response = append(response, ItemResponse{
			ID:           i.ID,
			Category:     i.CategoryID,
			CategoryName: catName,
			Code:         i.Code,
			Name:         i.Name,
			Image:        i.Image,
			Description:  i.Description,
			Price:        fmt.Sprintf("%.2f", i.Price),
			IsEnabled:    i.IsEnabled,
			CreatedAt:    i.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
			UpdatedAt:    i.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		})
	}
	utils.SuccessResponse(c, http.StatusOK, response)
}

func GetItem(c *gin.Context) {
	id := c.Param("id")
	var item models.Item
	if err := config.DB.Preload("Category").First(&item, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Item not found")
		return
	}
	
	catName := ""
	if item.Category.ID != 0 {
		catName = item.Category.Name
	}

	response := ItemResponse{
		ID:           item.ID,
		Category:     item.CategoryID,
		CategoryName: catName,
		Code:         item.Code,
		Name:         item.Name,
		Image:        item.Image,
		Description:  item.Description,
		Price:        fmt.Sprintf("%.2f", item.Price),
		IsEnabled:    item.IsEnabled,
		CreatedAt:    item.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		UpdatedAt:    item.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
	}
	utils.SuccessResponse(c, http.StatusOK, response)
}

func CreateCategory(c *gin.Context) {
	name := c.PostForm("name")
	isEnabledStr := c.PostForm("is_enabled")
	isEnabled := isEnabledStr == "true"

	category := models.Category{
		Name:      name,
		IsEnabled: isEnabled,
	}

	// Handle Image Upload
	file, err := c.FormFile("image")
	if err == nil {
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
		path := filepath.Join("media", "categories", filename)
		if err := c.SaveUploadedFile(file, path); err == nil {
			category.Image = "/" + path
		}
	}

	// Set StoreID from context
	if storeID, exists := c.Get("active_store_id"); exists {
		sid := storeID.(uint)
		category.StoreID = &sid
	}

	if err := config.DB.Create(&category).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create category")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, category)
}

func UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Category not found")
		return
	}

	name := c.PostForm("name")
	if name != "" {
		category.Name = name
	}
	
	isEnabledStr := c.PostForm("is_enabled")
	if isEnabledStr != "" {
		category.IsEnabled = isEnabledStr == "true"
	}

	// Handle Image Upload
	file, err := c.FormFile("image")
	if err == nil {
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
		path := filepath.Join("media", "categories", filename)
		if err := c.SaveUploadedFile(file, path); err == nil {
			category.Image = "/" + path
		}
	}

	if err := config.DB.Save(&category).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update category")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, category)
}

func DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Category{}, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete category")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Category deleted"})
}

func CreateItem(c *gin.Context) {
	name := c.PostForm("name")
	code := c.PostForm("code")
	description := c.PostForm("description")
	priceStr := c.PostForm("price")
	categoryIDStr := c.PostForm("category")
	isEnabledStr := c.PostForm("is_enabled")

	price, _ := strconv.ParseFloat(priceStr, 64)
	isEnabled := isEnabledStr == "true"

	item := models.Item{
		Name:        name,
		Code:        code,
		Description: description,
		Price:       price,
		IsEnabled:   isEnabled,
	}

	if categoryIDStr != "" {
		catID, _ := strconv.ParseUint(categoryIDStr, 10, 32)
		uCatID := uint(catID)
		item.CategoryID = &uCatID
	}

	// Handle Image Upload
	file, err := c.FormFile("image")
	if err == nil {
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
		path := filepath.Join("media", "items", filename)
		if err := c.SaveUploadedFile(file, path); err == nil {
			item.Image = "/" + path
		}
	}

	// Set StoreID from context
	if storeID, exists := c.Get("active_store_id"); exists {
		sid := storeID.(uint)
		item.StoreID = &sid
	}

	if err := config.DB.Create(&item).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create item")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, item)
}

func UpdateItem(c *gin.Context) {
	id := c.Param("id")
	var item models.Item
	if err := config.DB.First(&item, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Item not found")
		return
	}

	if name := c.PostForm("name"); name != "" {
		item.Name = name
	}
	if code := c.PostForm("code"); code != "" {
		item.Code = code
	}
	if description := c.PostForm("description"); description != "" {
		item.Description = description
	}
	if priceStr := c.PostForm("price"); priceStr != "" {
		price, _ := strconv.ParseFloat(priceStr, 64)
		item.Price = price
	}
	if categoryIDStr := c.PostForm("category"); categoryIDStr != "" {
		catID, _ := strconv.ParseUint(categoryIDStr, 10, 32)
		uCatID := uint(catID)
		item.CategoryID = &uCatID
	}
	if isEnabledStr := c.PostForm("is_enabled"); isEnabledStr != "" {
		item.IsEnabled = isEnabledStr == "true"
	}

	// Handle Image Upload
	file, err := c.FormFile("image")
	if err == nil {
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
		path := filepath.Join("media", "items", filename)
		if err := c.SaveUploadedFile(file, path); err == nil {
			item.Image = "/" + path
		}
	}

	if err := config.DB.Save(&item).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update item")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, item)
}

func DeleteItem(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Item{}, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete item")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Item deleted"})
}

func ToggleItemStatus(c *gin.Context) {
	id := c.Param("id")
	var item models.Item
	if err := config.DB.First(&item, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Item not found")
		return
	}

	item.IsEnabled = !item.IsEnabled
	if err := config.DB.Save(&item).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to toggle status")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, item)
}

func ToggleCategoryStatus(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Category not found")
		return
	}

	category.IsEnabled = !category.IsEnabled
	if err := config.DB.Save(&category).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to toggle status")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, category)
}
