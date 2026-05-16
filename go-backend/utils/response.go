package utils

import (
	"github.com/gin-gonic/gin"
	"strings"
)

func SuccessResponse(c *gin.Context, status int, data interface{}) {
	c.JSON(status, data)
}

func ErrorResponse(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

func IsMobileRequest(c *gin.Context) bool {
	// 1. Check for explicit header from our web app
	isMobileHeader := c.GetHeader("X-Is-Mobile")
	if isMobileHeader == "true" {
		return true
	}
	if isMobileHeader == "false" {
		return false
	}

	// 2. Check for Desktop header
	if c.GetHeader("X-Is-Desktop") == "true" {
		return false
	}

	// 3. Check User-Agent
	ua := c.Request.UserAgent()
	if ua == "" {
		// Generic clients (like some flutter configs) might not send UA
		// Default to mobile for safety with legacy flutter app
		return true
	}

	// If it contains mobile keywords, it's mobile
	mobileKeywords := []string{"Android", "webOS", "iPhone", "iPad", "iPod", "BlackBerry", "IEMobile", "Opera Mini", "Dart", "Flutter"}
	for _, keyword := range mobileKeywords {
		if strings.Contains(ua, keyword) {
			return true
		}
	}

	// 4. Check for Desktop keywords. If it has Macintosh, Windows, or Linux (but not Android), it's likely desktop
	if (strings.Contains(ua, "Macintosh") || strings.Contains(ua, "Windows") || (strings.Contains(ua, "Linux") && !strings.Contains(ua, "Android"))) && !strings.Contains(ua, "Mobile") {
		return false
	}

	// 5. Default to true for backward compatibility with the Flutter app
	return true
}
