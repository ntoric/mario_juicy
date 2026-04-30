package controllers

import (
	"fmt"
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
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
	storeID := c.Query("store_id")
	utils.Debug("Fetching categories", zap.String("storeID", storeID))
	query := config.DB
	if storeID != "" {
		query = query.Where("store_id = ?", storeID)
	}
	if err := query.Find(&categories).Error; err != nil {
		utils.Error("Failed to fetch categories", zap.Error(err), zap.String("storeID", storeID))
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
	storeID := c.Query("store_id")
	categoryID := c.Query("category_id")
	utils.Debug("Fetching items", zap.String("storeID", storeID), zap.String("categoryID", categoryID))
	query := config.DB.Preload("Category")
	if storeID != "" {
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
