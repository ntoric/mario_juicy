package routes

import (
	"mario-backend/controllers"
	"mario-backend/middleware"
	"mario-backend/websocket"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, hub *websocket.Hub) {
	api := r.Group("/api")
	{
		users := api.Group("/users")
		{
			users.POST("/login/", controllers.Login)
			users.GET("/profile/", middleware.AuthMiddleware(), controllers.GetProfile)
			users.POST("/change-password/", middleware.AuthMiddleware(), controllers.ChangePassword)

			// Protected management routes
			management := users.Group("/management", middleware.AuthMiddleware(), middleware.StoreMiddleware())
			{
				management.GET("/", controllers.GetUsers)
				management.POST("/", controllers.CreateUser)
				management.PATCH("/:id/", controllers.UpdateUser)
				management.DELETE("/:id/", controllers.DeleteUser)
				management.POST("/:id/reset-password/", controllers.ResetPassword)
			}

			perms := users.Group("/", middleware.AuthMiddleware(), middleware.StoreMiddleware())
			{
				perms.GET("/groups/", controllers.GetGroups)
			}
		}

		stores := api.Group("/stores", middleware.AuthMiddleware())
		{
			stores.GET("/", controllers.GetStores) // StoreMiddleware will handle isolation inside controller or here
			stores.GET("/:id/", middleware.StoreMiddleware(), controllers.GetStore)
			stores.POST("/", middleware.SuperuserMiddleware(), controllers.CreateStore)
			stores.PATCH("/:id/", middleware.StoreMiddleware(), middleware.SuperuserMiddleware(), controllers.UpdateStore)
			stores.DELETE("/:id/", middleware.SuperuserMiddleware(), controllers.DeleteStore)
		}

		// Catalog, Restaurant, Core, Reports all need Store isolation
		protected := api.Group("/", middleware.AuthMiddleware(), middleware.StoreMiddleware())
		{
			catalogs := protected.Group("/catalogs")
			{
				catalogs.GET("/categories/", controllers.GetCategories)
				catalogs.POST("/categories/", controllers.CreateCategory)
				catalogs.PATCH("/categories/:id/", controllers.UpdateCategory)
				catalogs.DELETE("/categories/:id/", controllers.DeleteCategory)
				catalogs.POST("/categories/:id/toggle_status/", controllers.ToggleCategoryStatus)

				catalogs.GET("/items/", controllers.GetItems)
				catalogs.GET("/items/:id/", controllers.GetItem)
				catalogs.POST("/items/", controllers.CreateItem)
				catalogs.PATCH("/items/:id/", controllers.UpdateItem)
				catalogs.DELETE("/items/:id/", controllers.DeleteItem)
				catalogs.POST("/items/:id/toggle_status/", controllers.ToggleItemStatus)
			}

			restaurants := protected.Group("/restaurants")
			{
				restaurants.GET("/tables/", controllers.GetTables)
				restaurants.POST("/tables/", controllers.CreateTable)
				restaurants.PATCH("/tables/:id/", controllers.UpdateTable)
				restaurants.DELETE("/tables/:id/", controllers.DeleteTable)
				restaurants.PATCH("/tables/:id/update_position/", controllers.UpdateTablePosition)
				restaurants.POST("/tables/:id/release/", controllers.ReleaseTable)
				restaurants.POST("/tables/recalculate_all/", controllers.RecalculateAllTableStatuses)

				restaurants.GET("/orders/", controllers.GetOrders)
				restaurants.GET("/orders/:id/", controllers.GetOrder)
				restaurants.PATCH("/orders/:id/", controllers.UpdateOrder)
				restaurants.DELETE("/orders/:id/", controllers.DeleteOrder)
				restaurants.POST("/orders/:id/add_item/", controllers.AddItemToOrder)
				restaurants.POST("/orders/:id/send_to_kitchen/", controllers.SendToKitchen)
				restaurants.POST("/orders/:id/serve_all_ready/", controllers.ServeAllReady)
				restaurants.POST("/orders/:id/cancel_order/", controllers.CancelOrder)
				restaurants.POST("/orders/:id/change_table/", controllers.ChangeOrderTable)
				restaurants.POST("/orders/:id/recalculate_total/", controllers.RecalculateOrderTotal)
				restaurants.POST("/orders/:id/update_payment_status/", controllers.UpdatePaymentStatus)
				restaurants.POST("/orders/:id/checkout/", controllers.Checkout)

				restaurants.GET("/orders/pending_settlements/", controllers.GetPendingSettlements)
				restaurants.POST("/orders/", controllers.CreateOrder)
				restaurants.GET("/invoices/", controllers.GetInvoices)

				orderItems := restaurants.Group("/order-items")
				{
					orderItems.PATCH("/:id/", controllers.UpdateOrderItem)
					orderItems.DELETE("/:id/", controllers.DeleteOrderItem)
				}

				kitchen := restaurants.Group("/kitchen")
				{
					kitchen.GET("/", controllers.GetKitchenItems)
					kitchen.POST("/:id/attend/", controllers.AttendItem)
					kitchen.POST("/:id/ready/", controllers.ReadyItem)
					kitchen.POST("/:id/reject/", controllers.RejectItem)
				}

				rest_reports := restaurants.Group("/reports")
				{
					rest_reports.GET("/summary/", controllers.GetSummary)
					rest_reports.GET("/sales_by_type/", controllers.GetSalesByType)
					rest_reports.GET("/sales_by_payment/", controllers.GetSalesByPayment)
					rest_reports.GET("/daily_sales/", controllers.GetDailySales)
					rest_reports.GET("/sales_by_category/", controllers.GetSalesByCategory)
					rest_reports.GET("/sales_by_item/", controllers.GetSalesByItem)
					rest_reports.GET("/tax_report/", controllers.GetTaxReport)
				}
			}

			core := protected.Group("/core")
			{
				core.GET("/tax-configuration/", controllers.GetTaxConfiguration)
				core.PUT("/tax-configuration/", middleware.PermissionMiddleware("store_settings"), controllers.UpdateTaxConfiguration)
				core.GET("/business-config/", controllers.GetBusinessConfig)
				core.POST("/business-config/", middleware.PermissionMiddleware("store_settings"), controllers.UpdateBusinessConfig)
				core.POST("/system-reset/", middleware.SuperuserMiddleware(), controllers.SystemReset)
			}

			reports := protected.Group("/reports")
			{
				reports.GET("/dashboard/", controllers.GetDashboardStats)
				reports.GET("/business-statistics/", controllers.GetBusinessStatistics)
				reports.GET("/store-basis-sales/", controllers.GetStoreBasisSales)
				reports.GET("/store-basis-top-items/", controllers.GetStoreBasisTopItems)
			}

			notifications := protected.Group("/notifications")
			{
				notifications.GET("/", controllers.GetNotifications)
				notifications.POST("/mark-all-read/", controllers.MarkAllNotificationsAsRead)
				notifications.PATCH("/:id/mark-read/", controllers.MarkNotificationAsRead)
			}
		}

		api.GET("/support/", controllers.GetSupportSettings)
		api.GET("/ws", websocket.ServeWS(hub))
	}
}
