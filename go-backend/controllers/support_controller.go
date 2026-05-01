package controllers

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetSupportSettings(c *gin.Context) {
	var supportSettings models.SupportSettings
	if err := config.DB.First(&supportSettings).Error; err != nil {
		// If not found, return default values or empty
		supportSettings = models.SupportSettings{
			Email: "support@mario.com",
			Phone: "+91 99999 99999",
		}
	}

	utils.SuccessResponse(c, http.StatusOK, supportSettings)
}
