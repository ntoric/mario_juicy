package middleware

import (
	"mario-backend/utils"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Logger is a middleware that logs HTTP requests using zap
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Log details after request is processed
		latency := time.Since(start)
		status := c.Writer.Status()
		method := c.Request.Method
		clientIP := c.ClientIP()
		userAgent := c.Request.UserAgent()

		fields := []zap.Field{
			zap.Int("status", status),
			zap.String("method", method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", clientIP),
			zap.Duration("latency", latency),
			zap.String("user-agent", userAgent),
		}

		if len(c.Errors) > 0 {
			for _, e := range c.Errors.Errors() {
				utils.Error(e, fields...)
			}
		} else {
			if status >= 500 {
				utils.Error("Server Error", fields...)
			} else if status >= 400 {
				utils.Warn("Client Error", fields...)
			} else {
				utils.Info("Request Processed", fields...)
			}
		}
	}
}
