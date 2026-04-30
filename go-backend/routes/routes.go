package routes

import (
	"mario-backend/controllers"
	"mario-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		users := api.Group("/users")
		{
			users.POST("/login/", controllers.Login)
			users.GET("/profile/", middleware.AuthMiddleware(), controllers.GetProfile)
			users.GET("/management/", middleware.AuthMiddleware(), controllers.GetUsers)
			users.POST("/management/", middleware.AuthMiddleware(), controllers.CreateUser)
			users.PATCH("/management/:id/", middleware.AuthMiddleware(), controllers.UpdateUser)
			users.DELETE("/management/:id/", middleware.AuthMiddleware(), controllers.DeleteUser)
			users.GET("/groups/", middleware.AuthMiddleware(), controllers.GetGroups)
			users.GET("/menu-permissions/", middleware.AuthMiddleware(), controllers.GetMenuPermissions)
			users.POST("/menu-permissions/", middleware.AuthMiddleware(), controllers.CreateMenuPermission)
			users.PATCH("/menu-permissions/:id/", middleware.AuthMiddleware(), controllers.UpdateMenuPermission)
		}

		stores := api.Group("/stores")
		{
			stores.GET("/", controllers.GetStores)
			stores.GET("/:id/", controllers.GetStore)
			stores.POST("/", middleware.AuthMiddleware(), controllers.CreateStore)
			stores.PUT("/:id/", middleware.AuthMiddleware(), controllers.UpdateStore)
		}

		catalogs := api.Group("/catalogs")
		{
			catalogs.GET("/categories/", controllers.GetCategories)
			catalogs.GET("/items/", controllers.GetItems)
			catalogs.GET("/items/:id/", controllers.GetItem)
		}

		restaurants := api.Group("/restaurants")
		{
			restaurants.GET("/tables/", controllers.GetTables)
			restaurants.POST("/tables/", middleware.AuthMiddleware(), controllers.CreateTable)
			restaurants.PATCH("/tables/:id/", middleware.AuthMiddleware(), controllers.UpdateTable)
			restaurants.DELETE("/tables/:id/", middleware.AuthMiddleware(), controllers.DeleteTable)
			restaurants.PATCH("/tables/:id/update_position/", middleware.AuthMiddleware(), controllers.UpdateTablePosition)
			restaurants.POST("/tables/:id/release/", middleware.AuthMiddleware(), controllers.ReleaseTable)
			restaurants.POST("/tables/recalculate_all/", middleware.AuthMiddleware(), controllers.RecalculateAllTableStatuses)

			restaurants.GET("/orders/", controllers.GetOrders)
			restaurants.GET("/orders/:id/", controllers.GetOrder)
			restaurants.PATCH("/orders/:id/", middleware.AuthMiddleware(), controllers.UpdateOrder)
			restaurants.DELETE("/orders/:id/", middleware.AuthMiddleware(), controllers.DeleteOrder)
			restaurants.POST("/orders/:id/add_item/", middleware.AuthMiddleware(), controllers.AddItemToOrder)
			restaurants.POST("/orders/:id/send_to_kitchen/", middleware.AuthMiddleware(), controllers.SendToKitchen)
			restaurants.POST("/orders/:id/serve_all_ready/", middleware.AuthMiddleware(), controllers.ServeAllReady)
			restaurants.POST("/orders/:id/cancel_order/", middleware.AuthMiddleware(), controllers.CancelOrder)
			restaurants.POST("/orders/:id/change_table/", middleware.AuthMiddleware(), controllers.ChangeOrderTable)
			restaurants.POST("/orders/:id/recalculate_total/", middleware.AuthMiddleware(), controllers.RecalculateOrderTotal)
			restaurants.POST("/orders/:id/update_payment_status/", middleware.AuthMiddleware(), controllers.UpdatePaymentStatus)
			restaurants.POST("/orders/:id/checkout/", middleware.AuthMiddleware(), controllers.Checkout)
			
			restaurants.GET("/orders/pending_settlements/", middleware.AuthMiddleware(), controllers.GetPendingSettlements)
			restaurants.POST("/orders/", middleware.AuthMiddleware(), controllers.CreateOrder)
			restaurants.GET("/invoices/", middleware.AuthMiddleware(), controllers.GetInvoices)

			orderItems := restaurants.Group("/order-items")
			{
				orderItems.PATCH("/:id/", middleware.AuthMiddleware(), controllers.UpdateOrderItem)
				orderItems.DELETE("/:id/", middleware.AuthMiddleware(), controllers.DeleteOrderItem)
			}

			kitchen := restaurants.Group("/kitchen")
			{
				kitchen.GET("/", middleware.AuthMiddleware(), controllers.GetKitchenItems)
				kitchen.POST("/:id/attend/", middleware.AuthMiddleware(), controllers.AttendItem)
				kitchen.POST("/:id/ready/", middleware.AuthMiddleware(), controllers.ReadyItem)
				kitchen.POST("/:id/reject/", middleware.AuthMiddleware(), controllers.RejectItem)
			}
			
			reports := restaurants.Group("/reports")
			{
				reports.GET("/summary/", middleware.AuthMiddleware(), controllers.GetSummary)
				reports.GET("/sales_by_type/", middleware.AuthMiddleware(), controllers.GetSalesByType)
				reports.GET("/sales_by_payment/", middleware.AuthMiddleware(), controllers.GetSalesByPayment)
				reports.GET("/daily_sales/", middleware.AuthMiddleware(), controllers.GetDailySales)
				reports.GET("/sales_by_category/", middleware.AuthMiddleware(), controllers.GetSalesByCategory)
				reports.GET("/sales_by_item/", middleware.AuthMiddleware(), controllers.GetSalesByItem)
				reports.GET("/tax_report/", middleware.AuthMiddleware(), controllers.GetTaxReport)
			}
		}

		core := api.Group("/core")
		{
			core.GET("/tax-configuration/", controllers.GetTaxConfiguration)
			core.PUT("/tax-configuration/", middleware.AuthMiddleware(), controllers.UpdateTaxConfiguration)
			core.POST("/system-reset/", middleware.AuthMiddleware(), controllers.SystemReset)
		}

		reports := api.Group("/reports")
		{
			reports.GET("/dashboard/", middleware.AuthMiddleware(), controllers.GetDashboardStats)
		}
	}
}
