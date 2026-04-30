package utils

import (
	"github.com/gin-gonic/gin"
)

func SuccessResponse(c *gin.Context, status int, data interface{}) {
	c.JSON(status, data)
}

func ErrorResponse(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}
