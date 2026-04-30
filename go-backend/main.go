package main

import (
	"mario-backend/config"
	"mario-backend/middleware"
	"mario-backend/models"
	"mario-backend/routes"
	"mario-backend/utils"
	"mario-backend/websocket"
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
			// Allow localhost, the network IP, and any origin that matches the network IP
			return true 
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Store-ID", "X-Requested-With", "Cache-Control", "Access-Control-Allow-Private-Network"},
		ExposeHeaders:    []string{"Content-Length", "Access-Control-Allow-Origin"},
		AllowCredentials: true,
	}))

	// Initialize WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	// Serve static files (images)
	if _, err := os.Stat("media"); os.IsNotExist(err) {
		os.MkdirAll("media/items", 0755)
		os.MkdirAll("media/categories", 0755)
	}
	r.Static("/media", "./media")

	// Routes
	routes.SetupRoutes(r, hub)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	utils.Info("Server starting", zap.String("port", port))
	r.Run(":" + port)
}
