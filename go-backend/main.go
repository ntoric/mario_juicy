package main

import (
	"mario-backend/config"
	"mario-backend/middleware"
	"mario-backend/models"
	"mario-backend/routes"
	"mario-backend/services"
	"mario-backend/utils"
	"mario-backend/websocket"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/getsentry/sentry-go"
	sentrygin "github.com/getsentry/sentry-go/gin"
	"go.uber.org/zap"
)

func main() {
	// Initialize Logger
	utils.InitializeLogger()
	defer utils.Log.Sync()

	// Initialize Config and Database
	config.LoadConfig()

	// Initialize Sentry
	err := sentry.Init(sentry.ClientOptions{
		Dsn: os.Getenv("SENTRY_DSN"),
		EnableTracing: true,
		// Set TracesSampleRate to 1.0 to capture 100%
		// of transactions for performance monitoring.
		// We recommend adjusting this value in production,
		TracesSampleRate: 1.0,
	})
	if err != nil {
		utils.Error("Sentry initialization failed", zap.Error(err))
	} else {
		utils.Info("Sentry initialized successfully")
	}
	defer sentry.Flush(2 * time.Second)

	config.ConnectDatabase()
	config.ConnectRedis()
	config.DB.AutoMigrate(&models.User{}, &models.Group{}, &models.SupportSettings{}, &models.Store{}, &models.Notification{}, &models.BusinessConfig{})
	seedGroups()
	seedSupportSettings()

	// Start Periodic Cleanup Cron
	services.StartDataCleanupCron()

	// Initialize Gin
	r := gin.New()

	// Global Middleware
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())
	r.Use(sentrygin.New(sentrygin.Options{
		Repanic: true,
	}))

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

func seedGroups() {
	roles := []string{"SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "STAFF"}
	for _, role := range roles {
		var group models.Group
		if err := config.DB.Where("name = ?", role).First(&group).Error; err != nil {
			config.DB.Create(&models.Group{Name: role})
		}
	}
}

func seedSupportSettings() {
	var count int64
	config.DB.Model(&models.SupportSettings{}).Count(&count)
	if count == 0 {
		config.DB.Create(&models.SupportSettings{
			Email: "support@mario.com",
			Phone: "+91 99999 99999",
		})
	}
}


