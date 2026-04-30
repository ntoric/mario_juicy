package controllers

import (
	"fmt"
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type TaxConfigurationResponse struct {
	ID            uint    `json:"id"`
	Name          string  `json:"name"`
	TaxType       string  `json:"tax_type"`
	IsGSTEnabled  bool    `json:"is_gst_enabled"`
	CGSTRate      string  `json:"cgst_rate"`
	SGSTRate      string  `json:"sgst_rate"`
	IGSTRate      string  `json:"igst_rate"`
	IsCESSEnabled bool    `json:"is_cess_enabled"`
	CESSRate      string  `json:"cess_rate"`
	IsActive      bool    `json:"is_active"`
	UpdatedAt     string  `json:"updated_at"`
}

func GetTaxConfiguration(c *gin.Context) {
	var taxConfig models.TaxConfiguration
	storeID := c.Query("store_id")
	if storeID != "" {
		config.DB.Where("store_id = ?", storeID).First(&taxConfig)
	} else {
		config.DB.First(&taxConfig)
	}

	response := TaxConfigurationResponse{
		ID:            taxConfig.ID,
		Name:          taxConfig.Name,
		TaxType:       taxConfig.TaxType,
		IsGSTEnabled:  taxConfig.IsGSTEnabled,
		CGSTRate:      fmt.Sprintf("%.2f", taxConfig.CGSTRate),
		SGSTRate:      fmt.Sprintf("%.2f", taxConfig.SGSTRate),
		IGSTRate:      fmt.Sprintf("%.2f", taxConfig.IGSTRate),
		IsCESSEnabled: taxConfig.IsCESSEnabled,
		CESSRate:      fmt.Sprintf("%.2f", taxConfig.CESSRate),
		IsActive:      taxConfig.IsActive,
		UpdatedAt:     taxConfig.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

func UpdateTaxConfiguration(c *gin.Context) {
	var taxConfig models.TaxConfiguration
	if err := c.ShouldBindJSON(&taxConfig); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	config.DB.Save(&taxConfig)
	utils.SuccessResponse(c, http.StatusOK, taxConfig)
}

type SystemResetRequest struct {
	Target string `json:"target"`
}

func SystemReset(c *gin.Context) {
	var req SystemResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	tx := config.DB.Begin()

	resetOrders := func() error {
		if err := tx.Exec("DELETE FROM restaurants_orderitem").Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM restaurants_invoice").Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM restaurants_order").Error; err != nil {
			return err
		}
		if err := tx.Exec("UPDATE restaurants_table SET status = 'VACANT'").Error; err != nil {
			return err
		}
		return nil
	}

	resetReservations := func() error {
		return tx.Exec("DELETE FROM restaurants_reservation").Error
	}

	resetCatalog := func() error {
		if err := tx.Exec("DELETE FROM catalogs_item").Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM catalogs_category").Error; err != nil {
			return err
		}
		return nil
	}

	resetTables := func() error {
		return tx.Exec("DELETE FROM restaurants_table").Error
	}

	resetUsers := func() error {
		return tx.Exec("DELETE FROM users_user WHERE is_superuser = false").Error
	}

	resetSettings := func() error {
		return tx.Exec("UPDATE core_taxconfiguration SET cgst_rate = 0, sgst_rate = 0, igst_rate = 0, cess_rate = 0, is_gst_enabled = false, is_cess_enabled = false").Error
	}

	var err error
	switch req.Target {
	case "orders":
		err = resetOrders()
	case "reservations":
		err = resetReservations()
	case "catalog":
		err = resetCatalog()
	case "tables":
		err = resetTables()
	case "users":
		err = resetUsers()
	case "settings":
		err = resetSettings()
	case "all":
		if err = resetOrders(); err != nil {
			break
		}
		if err = resetReservations(); err != nil {
			break
		}
		if err = resetCatalog(); err != nil {
			break
		}
		if err = resetTables(); err != nil {
			break
		}
		if err = resetUsers(); err != nil {
			break
		}
		err = resetSettings()
	default:
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid reset target")
		return
	}

	if err != nil {
		tx.Rollback()
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to perform system reset: "+err.Error())
		return
	}

	tx.Commit()
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "System reset completed for: " + req.Target})
}
