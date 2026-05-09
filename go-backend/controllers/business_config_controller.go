package controllers

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetBusinessConfig(c *gin.Context) {
	storeID, _ := c.Get("active_store_id")
	if storeID == nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No active store selected")
		return
	}

	sid := storeID.(uint)
	var businessConfig models.BusinessConfig
	if err := config.DB.Where("store_id = ?", sid).First(&businessConfig).Error; err != nil {
		// Return empty config if not found
		businessConfig = models.BusinessConfig{
			StoreID: sid,
		}
	}

	utils.SuccessResponse(c, http.StatusOK, businessConfig)
}

func UpdateBusinessConfig(c *gin.Context) {
	storeID, _ := c.Get("active_store_id")
	if storeID == nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No active store selected")
		return
	}

	sid := storeID.(uint)
	var input models.BusinessConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	var businessConfig models.BusinessConfig
	err := config.DB.Where("store_id = ?", sid).First(&businessConfig).Error
	
	if err != nil {
		// Create new
		businessConfig = input
		businessConfig.StoreID = sid
		if err := config.DB.Create(&businessConfig).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create business config")
			return
		}
	} else {
		// Update existing
		businessConfig.ShopName = input.ShopName
		businessConfig.Branch = input.Branch
		businessConfig.Location = input.Location
		businessConfig.Mobile = input.Mobile
		businessConfig.GSTIN = input.GSTIN
		businessConfig.FSSAILicNo = input.FSSAILicNo
		
		if err := config.DB.Save(&businessConfig).Error; err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update business config")
			return
		}
	}

	utils.SuccessResponse(c, http.StatusOK, businessConfig)
}
