package main

import (
	"mario-backend/config"
	"mario-backend/middleware"
	"mario-backend/models"
	"mario-backend/routes"
	"mario-backend/utils"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// Initialize Logger
	utils.InitializeLogger()
	defer utils.Log.Sync()

	// Initialize Config and Database
	config.LoadConfig()
	config.ConnectDatabase()
	config.DB.AutoMigrate(&models.User{}, &models.Group{}, &models.MenuPermission{})

	// Initialize Gin
	r := gin.New()

	// Global Middleware
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())

	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return true // Allow all origins for development
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Store-ID"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Routes
	routes.SetupRoutes(r)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	utils.Info("Server starting", zap.String("port", port))
	r.Run(":" + port)
}
