package controllers

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type StoreResponse struct {
	ID                     uint      `json:"id"`
	Name                   string    `json:"name"`
	Address                string    `json:"address"`
	Phone                  string    `json:"phone"`
	Email                  string    `json:"email"`
	GSTNumber              string    `json:"gst_number"`
	Location               string    `json:"location"`
	FSSAILicNo             string    `json:"fssai_lic_no"`
	Mobile                 string    `json:"mobile"`
	InvoicePrefix          string    `json:"invoice_prefix"`
	Logo                   string    `json:"logo"`
	IsActive               bool      `json:"is_active"`
	IsKitchenStepEnabled   bool      `json:"is_kitchen_step_enabled"`
	IsTakeAwayEnabled      bool      `json:"is_take_away_enabled"`
	IsReservationsEnabled  bool      `json:"is_reservations_enabled"`
	ThermalPrinterSize     string    `json:"thermal_printer_size"`
	ThermalPrinterName     string    `json:"thermal_printer_name"`
	ThermalPrinterVendorID string    `json:"thermal_printer_vendor_id"`
	ThermalPrinterProductID string   `json:"thermal_printer_product_id"`
	CreatedAt              string    `json:"created_at"`
	UpdatedAt              string    `json:"updated_at"`
}

func GetStores(c *gin.Context) {
	var stores []models.Store
	isSuperuser, _ := c.Get("is_superuser")
	userStoreID, _ := c.Get("user_store_id")

	query := config.DB
	if isSuperuser == false {
		if userStoreID != nil {
			query = query.Where("id = ?", userStoreID)
		} else {
			// If not superuser and no store assigned, return empty list or error
			utils.SuccessResponse(c, http.StatusOK, []StoreResponse{})
			return
		}
	}
	query.Find(&stores)

	response := []StoreResponse{}
	for _, s := range stores {
		response = append(response, StoreResponse{
			ID:                     s.ID,
			Name:                   s.Name,
			Address:                s.Address,
			Phone:                  s.Phone,
			Email:                  s.Email,
			GSTNumber:              s.GSTNumber,
			Location:               s.Location,
			FSSAILicNo:             s.FSSAILicNo,
			Mobile:                 s.Mobile,
			InvoicePrefix:          s.InvoicePrefix,
			Logo:                   s.Logo,
			IsActive:               s.IsActive,
			IsKitchenStepEnabled:   s.IsKitchenStepEnabled,
			IsTakeAwayEnabled:      s.IsTakeAwayEnabled,
			IsReservationsEnabled:  s.IsReservationsEnabled,
			ThermalPrinterSize:     s.ThermalPrinterSize,
			ThermalPrinterName:     s.ThermalPrinterName,
			ThermalPrinterVendorID: s.ThermalPrinterVendorID,
			ThermalPrinterProductID: s.ThermalPrinterProductID,
			CreatedAt:              s.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
			UpdatedAt:              s.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		})
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

func GetStore(c *gin.Context) {
	id := c.Param("id")
	var s models.Store
	if err := config.DB.First(&s, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Store not found")
		return
	}

	response := StoreResponse{
		ID:                     s.ID,
		Name:                   s.Name,
		Address:                s.Address,
		Phone:                  s.Phone,
		Email:                  s.Email,
		GSTNumber:              s.GSTNumber,
		Location:               s.Location,
		FSSAILicNo:             s.FSSAILicNo,
		Mobile:                 s.Mobile,
		InvoicePrefix:          s.InvoicePrefix,
		Logo:                   s.Logo,
		IsActive:               s.IsActive,
		IsKitchenStepEnabled:   s.IsKitchenStepEnabled,
		IsTakeAwayEnabled:      s.IsTakeAwayEnabled,
		IsReservationsEnabled:  s.IsReservationsEnabled,
		ThermalPrinterSize:     s.ThermalPrinterSize,
		ThermalPrinterName:     s.ThermalPrinterName,
		ThermalPrinterVendorID: s.ThermalPrinterVendorID,
		ThermalPrinterProductID: s.ThermalPrinterProductID,
		CreatedAt:              s.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		UpdatedAt:              s.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

func CreateStore(c *gin.Context) {
	isSuperuser, _ := c.Get("is_superuser")
	if isSuperuser == false {
		utils.ErrorResponse(c, http.StatusForbidden, "Only Super Admins can create stores")
		return
	}

	var store models.Store
	if err := c.ShouldBindJSON(&store); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	config.DB.Create(&store)
	utils.SuccessResponse(c, http.StatusCreated, store)
}

func UpdateStore(c *gin.Context) {
	isSuperuser, _ := c.Get("is_superuser")
	if isSuperuser == false {
		utils.ErrorResponse(c, http.StatusForbidden, "Only Super Admins can update store settings")
		return
	}

	id := c.Param("id")
	var store models.Store
	if err := config.DB.First(&store, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Store not found")
		return
	}
	if err := c.ShouldBindJSON(&store); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	config.DB.Save(&store)
	utils.SuccessResponse(c, http.StatusOK, store)
}

func DeleteStore(c *gin.Context) {
	isSuperuser, _ := c.Get("is_superuser")
	if isSuperuser == false {
		utils.ErrorResponse(c, http.StatusForbidden, "Only Super Admins can delete stores")
		return
	}

	id := c.Param("id")
	if err := config.DB.Delete(&models.Store{}, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete store")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Store deleted successfully"})
}
