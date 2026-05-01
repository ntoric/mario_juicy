package controllers

import (
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetDashboardStats(c *gin.Context) {
	activeStoreID, _ := c.Get("active_store_id")
	
	// If it's a superuser, they might want to filter by a specific store via query
	// but for regular admins, StoreMiddleware already locked active_store_id.
	storeID := activeStoreID
	if storeID == nil {
		storeID = c.Query("store_id")
	}
	
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 1. Calculate Stats
	var totalOrders int64
	var totalRevenue float64
	var totalTables int64
	var occupiedTables int64

	orderQuery := config.DB.Model(&models.Order{}).Where("created_at >= ?", startOfDay)
	if storeID != "" {
		orderQuery = orderQuery.Where("store_id = ?", storeID)
	}
	orderQuery.Count(&totalOrders)
	
	row := orderQuery.Select("COALESCE(SUM(total_amount), 0)").Row()
	row.Scan(&totalRevenue)

	avgTicket := 0.0
	if totalOrders > 0 {
		avgTicket = totalRevenue / float64(totalOrders)
	}

	tableQuery := config.DB.Model(&models.Table{})
	if storeID != "" {
		tableQuery = tableQuery.Where("store_id = ?", storeID)
	}
	tableQuery.Count(&totalTables)
	tableQuery.Where("status != ?", "VACANT").Count(&occupiedTables)

	occupancy := 0.0
	if totalTables > 0 {
		occupancy = (float64(occupiedTables) / float64(totalTables)) * 100
	}

	stats := []gin.H{
		{"label": "Today's Sales", "value": "₹" + utils.FormatCurrency(totalRevenue), "trend": "+12.5%"},
		{"label": "Transactions", "value": totalOrders, "trend": "+3.2%"},
		{"label": "Avg. Ticket", "value": "₹" + utils.FormatCurrency(avgTicket), "trend": "+5.1%"},
		{"label": "Table Occupancy", "value": utils.FormatPercentage(occupancy), "trend": "+8.0%"},
	}

	// 2. Fetch Recent Transactions
	var recentOrders []models.Order
	recentQuery := config.DB.Preload("Table").Order("created_at desc").Limit(5)
	if storeID != "" {
		recentQuery = recentQuery.Where("store_id = ?", storeID)
	}
	recentQuery.Find(&recentOrders)

	recentTransactions := []gin.H{}
	for _, o := range recentOrders {
		customer := o.CustomerName
		if customer == "" && o.Table != nil {
			customer = "Table " + o.Table.Number
		} else if customer == "" {
			customer = "Guest"
		}

		recentTransactions = append(recentTransactions, gin.H{
			"id":       o.ID,
			"customer": customer,
			"total":    o.TotalAmount,
			"status":   o.Status,
			"time":     o.CreatedAt.Format("15:04"),
		})
	}

	// 3. Fetch Popular Items
	type PopularItem struct {
		Name  string  `json:"name"`
		Sales int     `json:"sales"`
		Amount float64 `json:"amount"`
	}
	var popularItems []PopularItem
	
	popularQuery := config.DB.Table("restaurants_orderitem").
		Select("catalogs_item.name, SUM(restaurants_orderitem.quantity) as sales, SUM(restaurants_orderitem.quantity * restaurants_orderitem.price) as amount").
		Joins("JOIN catalogs_item ON catalogs_item.id = restaurants_orderitem.item_id").
		Joins("JOIN restaurants_order ON restaurants_order.id = restaurants_orderitem.order_id").
		Where("restaurants_order.created_at >= ?", startOfDay).
		Group("catalogs_item.name").
		Order("sales desc").
		Limit(5)

	if storeID != "" {
		popularQuery = popularQuery.Where("restaurants_order.store_id = ?", storeID)
	}
	popularQuery.Scan(&popularItems)

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"stats":               stats,
		"recent_transactions": recentTransactions,
		"popular_items":       popularItems,
	})
}

func getFilteredInvoices(c *gin.Context) *gorm.DB {
	activeStoreID, _ := c.Get("active_store_id")
	storeID := activeStoreID
	if storeID == nil {
		storeID = c.Query("store_id")
	}
	
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	query := config.DB.Model(&models.Invoice{})

	if storeID != "" {
		query = query.Where("restaurants_invoice.store_id = ?", storeID)
	} else {
		query = query.Where("restaurants_invoice.store_id = ?", 1)
	}

	if startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err == nil {
			query = query.Where("restaurants_invoice.created_at >= ?", startDate)
		}
	} else {
		query = query.Where("restaurants_invoice.created_at >= ?", time.Now().AddDate(0, 0, -30))
	}

	if endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err == nil {
			endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 0, endDate.Location())
			query = query.Where("restaurants_invoice.created_at <= ?", endDate)
		}
	}

	return query
}

func GetSummary(c *gin.Context) {
	query := getFilteredInvoices(c)
	
	var result struct {
		TotalSales    float64 `json:"total_sales"`
		TotalOrders   int64   `json:"total_orders"`
		TotalTax      float64 `json:"total_tax"`
		AvgOrderValue float64 `json:"avg_order_value"`
	}

	query.Select("COALESCE(SUM(total_amount), 0) as total_sales, COUNT(id) as total_orders, COALESCE(SUM(tax_amount), 0) as total_tax, COALESCE(AVG(total_amount), 0) as avg_order_value").Scan(&result)

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"total_sales":     result.TotalSales,
		"total_orders":    result.TotalOrders,
		"total_tax":       result.TotalTax,
		"avg_order_value": result.AvgOrderValue,
		"currency":        "INR",
	})
}

func GetSalesByType(c *gin.Context) {
	query := getFilteredInvoices(c)
	
	type Result struct {
		OrderType  string  `json:"type"`
		TotalSales float64 `json:"sales"`
		OrderCount int64   `json:"count"`
	}
	var rawResults []struct {
		OrderType  string
		TotalSales float64
		OrderCount int64
	}

	query.Joins("JOIN restaurants_order ON restaurants_order.id = restaurants_invoice.order_id").
		Select("restaurants_order.order_type, SUM(restaurants_invoice.total_amount) as total_sales, COUNT(restaurants_invoice.id) as order_count").
		Group("restaurants_order.order_type").Scan(&rawResults)

	results := []Result{}
	for _, r := range rawResults {
		label := "Parcel"
		if r.OrderType == "DINE_IN" {
			label = "Dine-in"
		}
		results = append(results, Result{
			OrderType:  label,
			TotalSales: r.TotalSales,
			OrderCount: r.OrderCount,
		})
	}

	utils.SuccessResponse(c, http.StatusOK, results)
}

func GetSalesByPayment(c *gin.Context) {
	query := getFilteredInvoices(c)
	
	type Result struct {
		Method     string  `json:"method"`
		Sales      float64 `json:"sales"`
		OrderCount int64   `json:"count"`
	}
	var results []Result

	query.Select("payment_method as method, SUM(total_amount) as sales, COUNT(id) as order_count").
		Group("payment_method").Scan(&results)

	utils.SuccessResponse(c, http.StatusOK, results)
}

func GetDailySales(c *gin.Context) {
	query := getFilteredInvoices(c)
	
	type Result struct {
		Date  string  `json:"date"`
		Sales float64 `json:"sales"`
		Count int64   `json:"count"`
	}
	var results []Result

	query.Select("DATE(created_at) as date, SUM(total_amount) as sales, COUNT(id) as count").
		Group("DATE(created_at)").Order("date").Scan(&results)

	utils.SuccessResponse(c, http.StatusOK, results)
}

func GetSalesByCategory(c *gin.Context) {
	invoicesQuery := getFilteredInvoices(c)
	
	var orderIDs []uint
	invoicesQuery.Pluck("order_id", &orderIDs)

	type Result struct {
		Category string  `json:"category"`
		Sales    float64 `json:"sales"`
		Count    int64   `json:"count"`
	}
	var results []Result

	if len(orderIDs) > 0 {
		config.DB.Table("restaurants_orderitem").
			Select("COALESCE(catalogs_category.name, 'Uncategorized') as category, SUM(restaurants_orderitem.price * restaurants_orderitem.quantity) as sales, SUM(restaurants_orderitem.quantity) as count").
			Joins("JOIN catalogs_item ON catalogs_item.id = restaurants_orderitem.item_id").
			Joins("LEFT JOIN catalogs_category ON catalogs_category.id = catalogs_item.category_id").
			Where("restaurants_orderitem.order_id IN ? AND restaurants_orderitem.status != ?", orderIDs, "CANCELLED").
			Group("catalogs_category.name").Order("sales desc").Scan(&results)
	}

	utils.SuccessResponse(c, http.StatusOK, results)
}

func GetSalesByItem(c *gin.Context) {
	invoicesQuery := getFilteredInvoices(c)
	
	var orderIDs []uint
	invoicesQuery.Pluck("order_id", &orderIDs)

	type Result struct {
		Item  string  `json:"item"`
		Sales float64 `json:"sales"`
		Count int64   `json:"count"`
	}
	var results []Result

	if len(orderIDs) > 0 {
		config.DB.Table("restaurants_orderitem").
			Select("catalogs_item.name as item, SUM(restaurants_orderitem.price * restaurants_orderitem.quantity) as sales, SUM(restaurants_orderitem.quantity) as count").
			Joins("JOIN catalogs_item ON catalogs_item.id = restaurants_orderitem.item_id").
			Where("restaurants_orderitem.order_id IN ? AND restaurants_orderitem.status != ?", orderIDs, "CANCELLED").
			Group("catalogs_item.name").Order("sales desc").Limit(15).Scan(&results)
	}

	utils.SuccessResponse(c, http.StatusOK, results)
}

func GetTaxReport(c *gin.Context) {
	query := getFilteredInvoices(c)
	
	var result struct {
		TotalTax    float64 `json:"total_tax"`
		Subtotal    float64 `json:"subtotal"`
		TotalAmount float64 `json:"total_amount"`
	}

	query.Select("COALESCE(SUM(tax_amount), 0) as total_tax, COALESCE(SUM(subtotal), 0) as subtotal, COALESCE(SUM(total_amount), 0) as total_amount").Scan(&result)

	utils.SuccessResponse(c, http.StatusOK, result)
}

