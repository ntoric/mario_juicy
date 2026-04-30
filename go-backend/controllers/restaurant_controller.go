package controllers

import (
	"encoding/json"
	"fmt"
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/services"
	"mario-backend/utils"
	"mario-backend/websocket"
	"net/http"

	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type TableResponse struct {
	ID               uint          `json:"id"`
	Number           string        `json:"number"`
	Capacity         int           `json:"capacity"`
	Status           string        `json:"status"`
	IsActive         bool          `json:"is_active"`
	PosX             float64       `json:"pos_x"`
	PosY             float64       `json:"pos_y"`
	Shape            string        `json:"shape,omitempty"`
	ActiveOrder      interface{}   `json:"active_order"`
	ActiveOrders     []interface{} `json:"active_orders"`
	CurrentOccupancy int           `json:"current_occupancy"`
	CreatedAt        string        `json:"created_at"`
	UpdatedAt        string        `json:"updated_at"`
}

func GetTables(c *gin.Context) {
	var tables []models.Table
	storeID := c.Query("store_id")
	query := config.DB.Preload("Store")
	if storeID != "" {
		query = query.Where("store_id = ?", storeID)
	}
	query.Find(&tables)

	response := []TableResponse{}
	for _, t := range tables {
		// Calculate active orders
		var activeOrders []models.Order
		config.DB.Where("table_id = ? AND order_type = 'DINE_IN' AND status NOT IN ?", t.ID, services.TerminalStatuses).Find(&activeOrders)

		activeOrdersResp := []interface{}{}
		var currentOccupancy int
		for _, o := range activeOrders {
			activeOrdersResp = append(activeOrdersResp, gin.H{
				"id":                o.ID,
				"status":            o.Status,
				"total_amount":      fmt.Sprintf("%.2f", o.TotalAmount),
				"customer_name":     o.CustomerName,
				"number_of_persons": o.NumberOfPersons,
				"order_type":        o.OrderType,
				"created_at":        o.CreatedAt,
			})
			currentOccupancy += o.NumberOfPersons
		}

		var activeOrder interface{}
		if len(activeOrdersResp) > 0 {
			activeOrder = activeOrdersResp[0]
		}

		response = append(response, TableResponse{
			ID:               t.ID,
			Number:           t.Number,
			Capacity:         t.Capacity,
			Status:           t.Status,
			IsActive:         t.IsActive,
			PosX:             t.PosX,
			PosY:             t.PosY,
			Shape:            "RECT",
			ActiveOrder:      activeOrder,
			ActiveOrders:     activeOrdersResp,
			CurrentOccupancy: currentOccupancy,
			CreatedAt:        t.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
			UpdatedAt:        t.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		})
	}

	utils.SuccessResponse(c, http.StatusOK, response)
}

func CreateTable(c *gin.Context) {
	var table models.Table
	if err := c.ShouldBindJSON(&table); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Set StoreID from header if not provided
	if table.StoreID == nil {
		storeIDStr := c.GetHeader("X-Store-ID")
		if storeIDStr != "" {
			if sid, err := strconv.ParseUint(storeIDStr, 10, 32); err == nil {
				sidUint := uint(sid)
				table.StoreID = &sidUint
			}
		}
	}

	table.Shape = "RECT"
	if err := config.DB.Create(&table).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, table)
}

func UpdateTable(c *gin.Context) {
	id := c.Param("id")
	var table models.Table
	if err := config.DB.First(&table, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Table not found")
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := config.DB.Model(&table).Updates(input).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, table)
}

func DeleteTable(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Table{}, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Table deleted"})
}

func UpdateTablePosition(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		PosX  float64 `json:"pos_x"`
		PosY  float64 `json:"pos_y"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := config.DB.Model(&models.Table{}).Where("id = ?", id).Updates(map[string]interface{}{
		"pos_x": input.PosX,
		"pos_y": input.PosY,
	}).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Position updated"})
}

func ReleaseTable(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Model(&models.Table{}).Where("id = ?", id).Update("status", "VACANT").Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Table released"})
}

func RecalculateAllTableStatuses(c *gin.Context) {
	var tables []models.Table
	config.DB.Find(&tables)
	for _, t := range tables {
		services.UpdateTableStatus(t.ID)
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "All statuses recalculated"})
}

type OrderItemResponse struct {
	ID               uint        `json:"id"`
	Order            uint        `json:"order"`
	OrderTableNumber string      `json:"order_table_number"`
	OrderTableID     uint        `json:"order_table_id"`
	Item             uint        `json:"item"`
	ItemDetails      interface{} `json:"item_details"`
	Quantity         int         `json:"quantity"`
	Price            string      `json:"price"`
	Status           string      `json:"status"`
	Notes            string      `json:"notes"`
	CreatedAt        string      `json:"created_at"`
	UpdatedAt        string      `json:"updated_at"`
}

type OrderResponse struct {
	ID              uint                `json:"id"`
	Table           *uint               `json:"table"`
	TableNumber     string              `json:"table_number"`
	Waiter          *uint               `json:"waiter"`
	WaiterName      string              `json:"waiter_name"`
	Store           uint                `json:"store"`
	CustomerName    string              `json:"customer_name"`
	CustomerMobile  string              `json:"customer_mobile"`
	NumberOfPersons int                 `json:"number_of_persons"`
	Status          string              `json:"status"`
	OrderType       string              `json:"order_type"`
	TotalAmount     string              `json:"total_amount"`
	Notes           string              `json:"notes"`
	Items           []OrderItemResponse `json:"items"`
	Invoice         interface{}         `json:"invoice"`
	CreatedAt       string              `json:"created_at"`
	UpdatedAt       string              `json:"updated_at"`
}

func GetOrders(c *gin.Context) {
	var orders []models.Order
	storeID := c.Query("store_id")
	status := c.Query("status")
	query := config.DB.Preload("Table").Preload("Items.Item").Preload("Waiter")
	if storeID != "" {
		query = query.Where("store_id = ?", storeID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	query.Preload("Invoice").Find(&orders)
	utils.SuccessResponse(c, http.StatusOK, MapOrdersToResponse(orders))
}

func GetOrder(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := config.DB.Preload("Table").Preload("Items.Item").Preload("Waiter").Preload("Invoice.Store").First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, MapOrderToResponse(order))
}

func MapOrderToResponse(o models.Order) OrderResponse {
	itemResps := []OrderItemResponse{}
	for _, i := range o.Items {
		tableNumber := "Take Away"
		tableID := uint(0)
		if o.Table != nil {
			tableNumber = o.Table.Number
			tableID = o.Table.ID
		}

		itemResps = append(itemResps, OrderItemResponse{
			ID:               i.ID,
			Order:            i.OrderID,
			OrderTableNumber: tableNumber,
			OrderTableID:     tableID,
			Item:             i.ItemID,
			ItemDetails:      i.Item,
			Quantity:         i.Quantity,
			Price:            fmt.Sprintf("%.2f", i.Price),
			Status:           i.Status,
			Notes:            i.Notes,
			CreatedAt:        i.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
			UpdatedAt:        i.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		})
	}

	tableNumber := "Take Away"
	if o.Table != nil {
		tableNumber = o.Table.Number
	}

	waiterName := "Staff"
	if o.Waiter != nil {
		waiterName = o.Waiter.Username
	}

	return OrderResponse{
		ID:              o.ID,
		Table:           o.TableID,
		TableNumber:     tableNumber,
		Waiter:          o.WaiterID,
		WaiterName:      waiterName,
		Store:           services.SafeUint(o.StoreID),
		CustomerName:    o.CustomerName,
		CustomerMobile:  o.CustomerMobile,
		NumberOfPersons: o.NumberOfPersons,
		Status:          o.Status,
		OrderType:       o.OrderType,
		TotalAmount:     fmt.Sprintf("%.2f", o.TotalAmount),
		Notes:           o.Notes,
		Items:           itemResps,
		Invoice:         o.Invoice,
		CreatedAt:       o.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		UpdatedAt:       o.UpdatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
	}
}

func MapOrdersToResponse(orders []models.Order) []OrderResponse {
	response := []OrderResponse{}
	for _, o := range orders {
		response = append(response, MapOrderToResponse(o))
	}
	return response
}

func GetPendingSettlements(c *gin.Context) {
	var orders []models.Order
	storeID := c.Query("store_id")

	// Filter logic:
	// 1. DINE_IN: Show if COMPLETED OR has an Invoice (Checkout)
	// 2. TAKE_AWAY: Show only if READY (Ready to pickup)
	// 3. Always show CANCELLED for the cancelled tab
	query := config.DB.Preload("Table").Preload("Waiter").Preload("Invoice").Preload("Items.Item").
		Where(`
			(restaurants_order.order_type = 'DINE_IN' AND restaurants_order.status = 'COMPLETED' )
			OR (restaurants_order.order_type = 'TAKE_AWAY' AND restaurants_order.status = 'READY')
			OR restaurants_order.status = 'CANCELLED'
		`)

	if storeID != "" {
		query = query.Where("restaurants_order.store_id = ?", storeID)
	}

	query.Find(&orders)
	utils.SuccessResponse(c, http.StatusOK, MapOrdersToResponse(orders))
}

func CreateOrder(c *gin.Context) {
	var order models.Order
	if err := c.ShouldBindJSON(&order); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Set StoreID from header
	storeIDStr := c.GetHeader("X-Store-ID")
	if storeIDStr != "" {
		if sid, err := strconv.ParseUint(storeIDStr, 10, 32); err == nil {
			sidUint := uint(sid)
			order.StoreID = &sidUint
		}
	}

	// Set WaiterID from context
	userID, exists := c.Get("user_id")
	if exists {
		if uid, ok := userID.(uint); ok {
			order.WaiterID = &uid
		}
	}

	// Capacity Check
	if order.TableID != nil && order.OrderType == "DINE_IN" {
		var table models.Table
		if err := config.DB.First(&table, *order.TableID).Error; err == nil {
			currentOccupancy := services.GetTableCurrentOccupancy(*order.TableID, 0)
			if currentOccupancy+order.NumberOfPersons > table.Capacity {
				utils.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("Table capacity exceeded. Available: %d, Requested: %d", table.Capacity-currentOccupancy, order.NumberOfPersons))
				return
			}
		}
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		utils.Error("Failed to create order", zap.Error(err), zap.String("customer", order.CustomerName))
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create order: "+err.Error())
		return
	}

	if order.TableID != nil {
		services.UpdateTableStatus(*order.TableID)
	}

	utils.Info("Order created", zap.Uint("orderID", order.ID), zap.String("type", order.OrderType), zap.String("customer", order.CustomerName))
	// Re-fetch with preloads for complete response
	config.DB.Preload("Table").Preload("Items.Item").Preload("Waiter").Preload("Invoice").First(&order, order.ID)

	websocket.Broadcast("ORDER_CREATED", MapOrderToResponse(order))
	utils.SuccessResponse(c, http.StatusCreated, MapOrderToResponse(order))
}

func AddItemToOrder(c *gin.Context) {
	orderIDStr := c.Param("id")
	orderID, _ := strconv.ParseUint(orderIDStr, 10, 32)

	var input struct {
		ItemID   uint   `json:"item"`
		Quantity int    `json:"quantity"`
		Notes    string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	var item models.Item
	if err := config.DB.First(&item, input.ItemID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Item not found")
		return
	}

	orderItem := models.OrderItem{
		OrderID:  uint(orderID),
		ItemID:   input.ItemID,
		Quantity: input.Quantity,
		Price:    item.Price,
		Status:   "ORDERED",
		Notes:    input.Notes,
	}

	if err := config.DB.Create(&orderItem).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	services.UpdateOrderTotal(uint(orderID))

	utils.SuccessResponse(c, http.StatusCreated, orderItem)
}

func UpdateOrder(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	// We use a map to avoid overwriting fields not provided in JSON
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Capacity Check if persons updated
	if order.TableID != nil && order.OrderType == "DINE_IN" {
		if val, ok := input["number_of_persons"]; ok {
			var newPersons int
			switch v := val.(type) {
			case float64:
				newPersons = int(v)
			case int:
				newPersons = v
			}

			if newPersons > 0 {
				var table models.Table
				if err := config.DB.First(&table, *order.TableID).Error; err == nil {
					currentOccupancy := services.GetTableCurrentOccupancy(*order.TableID, order.ID)
					if currentOccupancy+newPersons > table.Capacity {
						utils.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("Table capacity exceeded. Available: %d, Requested: %d", table.Capacity-currentOccupancy, newPersons))
						return
					}
				}
			}
		}
	}

	if err := config.DB.Model(&order).Updates(input).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// If status changed, update table status and items status
	if status, ok := input["status"].(string); ok {
		if order.TableID != nil {
			services.UpdateTableStatus(*order.TableID)
		}

		// Propagate certain statuses to items
		if status == "READY" || status == "SERVED" || status == "COMPLETED" || status == "PAID" {
			itemStatus := status
			if status == "COMPLETED" || status == "PAID" {
				itemStatus = "SERVED" // Items don't have COMPLETED/PAID status
			}
			config.DB.Model(&models.OrderItem{}).Where("order_id = ? AND status NOT IN ?", order.ID, []string{"CANCELLED", "REJECTED"}).Update("status", itemStatus)
		}
	}

	// Re-fetch with preloads for complete response
	if err := config.DB.Preload("Table").Preload("Items.Item").Preload("Waiter").Preload("Invoice").First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to re-fetch order")
		return
	}

	websocket.Broadcast("ORDER_UPDATED", MapOrderToResponse(order))
	utils.SuccessResponse(c, http.StatusOK, MapOrderToResponse(order))
}

func DeleteOrder(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	tableID := order.TableID
	if err := config.DB.Delete(&order).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if tableID != nil {
		services.UpdateTableStatus(*tableID)
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Order deleted"})
}

func SendToKitchen(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	// Advance ORDERED items to AWAITING or PREPARING
	// Logic from Django: If kitchen step enabled ? AWAITING : PREPARING
	// For simplicity, let's go to PREPARING for now or check store
	status := "PREPARING"

	err := config.DB.Model(&models.OrderItem{}).Where("order_id = ? AND status = 'ORDERED'", order.ID).Update("status", status).Error
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if order.Status == "ORDER_TAKEN" {
		config.DB.Model(&order).Update("status", status)
	}

	websocket.Broadcast("ORDER_UPDATED", gin.H{"id": order.ID, "status": status})
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Sent to kitchen"})
}

func ServeAllReady(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	err := config.DB.Model(&models.OrderItem{}).Where("order_id = ? AND status IN ?", order.ID, []string{"READY", "PREPARING"}).Update("status", "SERVED").Error
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Check if all items served
	var count int64
	config.DB.Model(&models.OrderItem{}).Where("order_id = ? AND status NOT IN ?", order.ID, []string{"SERVED", "CANCELLED"}).Count(&count)
	if count == 0 {
		config.DB.Model(&order).Update("status", "SERVED")
	}

	websocket.Broadcast("ORDER_UPDATED", gin.H{"id": order.ID, "status": "SERVED"})
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "All items served"})
}

func CancelOrder(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&input)

	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	notes := fmt.Sprintf("CANCELLED: %s\n%s", input.Reason, order.Notes)
	if err := config.DB.Model(&order).Updates(map[string]interface{}{
		"status": "CANCELLED",
		"notes":  notes,
	}).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if order.TableID != nil {
		services.UpdateTableStatus(*order.TableID)
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Order cancelled"})
}

func ChangeOrderTable(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		TargetTableID uint `json:"target_table_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	// Capacity Check on Target Table
	if order.OrderType == "DINE_IN" {
		var targetTable models.Table
		if err := config.DB.First(&targetTable, input.TargetTableID).Error; err == nil {
			currentOccupancy := services.GetTableCurrentOccupancy(input.TargetTableID, order.ID)
			if currentOccupancy+order.NumberOfPersons > targetTable.Capacity {
				utils.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("Target table capacity exceeded. Available: %d, Required: %d", targetTable.Capacity-currentOccupancy, order.NumberOfPersons))
				return
			}
		}
	}

	oldTableID := order.TableID
	if err := config.DB.Model(&order).Update("table_id", input.TargetTableID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if oldTableID != nil {
		services.UpdateTableStatus(*oldTableID)
	}
	services.UpdateTableStatus(input.TargetTableID)

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Table changed"})
}

func RecalculateOrderTotal(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	if err := services.UpdateOrderTotal(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	var order models.Order
	config.DB.First(&order, id)
	utils.SuccessResponse(c, http.StatusOK, gin.H{"total_amount": fmt.Sprintf("%.2f", order.TotalAmount)})
}

func UpdatePaymentStatus(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	if err := config.DB.Model(&order).Update("status", input.Status).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if order.TableID != nil {
		services.UpdateTableStatus(*order.TableID)
	}

	utils.SuccessResponse(c, http.StatusOK, MapOrderToResponse(order))
}

func Checkout(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := config.DB.Preload("Items").First(&order, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order not found")
		return
	}

	var input struct {
		PaymentMethod string `json:"payment_method"`
		MarkAsPaid    bool   `json:"mark_as_paid"`
		Notes         string `json:"notes"`
	}
	c.ShouldBindJSON(&input)
	if input.PaymentMethod == "" {
		input.PaymentMethod = "CASH"
	}

	// Simple Tax Calculation
	var taxConfig models.TaxConfiguration
	config.DB.Where("store_id = ?", order.StoreID).First(&taxConfig)

	subtotal := order.TotalAmount
	taxAmount := 0.0
	taxDetailsMap := make(map[string]string)

	if taxConfig.IsActive {
		if taxConfig.TaxType == "EXCLUSIVE" {
			if taxConfig.IsGSTEnabled {
				cgst := (subtotal * taxConfig.CGSTRate) / 100.0
				sgst := (subtotal * taxConfig.SGSTRate) / 100.0
				taxAmount += cgst + sgst
				taxDetailsMap["CGST"] = fmt.Sprintf("%.2f", cgst)
				taxDetailsMap["SGST"] = fmt.Sprintf("%.2f", sgst)
			}
		} else if taxConfig.TaxType == "INCLUSIVE" {
			// Simplified inclusive calculation
			totalRate := 0.0
			if taxConfig.IsGSTEnabled {
				totalRate += taxConfig.CGSTRate + taxConfig.SGSTRate
			}
			if totalRate > 0 {
				actualBase := subtotal / (1 + (totalRate / 100.0))
				taxAmount = subtotal - actualBase
				taxDetailsMap["GST (Incl.)"] = fmt.Sprintf("%.2f", taxAmount)
			}
		}
	}

	totalAmount := subtotal
	if taxConfig.TaxType == "EXCLUSIVE" {
		totalAmount = subtotal + taxAmount
	}

	taxDetailsJSON, _ := json.Marshal(taxDetailsMap)

	var invoice models.Invoice
	var existingInvoice models.Invoice
	if err := config.DB.Where("order_id = ?", order.ID).First(&existingInvoice).Error; err == nil {
		// Update existing invoice
		existingInvoice.Subtotal = subtotal
		existingInvoice.TaxAmount = taxAmount
		existingInvoice.TaxDetails = string(taxDetailsJSON)
		existingInvoice.TotalAmount = totalAmount
		existingInvoice.PaymentMethod = input.PaymentMethod

		if err := config.DB.Save(&existingInvoice).Error; err != nil {
			utils.Error("Failed to update invoice", zap.Error(err), zap.Uint("orderID", order.ID))
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		}
		invoice = existingInvoice
	} else {
		// Create new invoice
		invoice = models.Invoice{
			InvoiceNumber: services.GenerateInvoiceNumber(),
			StoreID:       order.StoreID,
			OrderID:       order.ID,
			Subtotal:      subtotal,
			TaxAmount:     taxAmount,
			TaxDetails:    string(taxDetailsJSON),
			TotalAmount:   totalAmount,
			PaymentMethod: input.PaymentMethod,
			WaiterID:      order.WaiterID,
		}

		if err := config.DB.Create(&invoice).Error; err != nil {
			utils.Error("Failed to create invoice", zap.Error(err), zap.Uint("orderID", order.ID))
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// Preload Store and Waiter for the response
	config.DB.Preload("Store").Preload("Waiter").First(&invoice, invoice.ID)

	if input.MarkAsPaid {
		updates := map[string]interface{}{
			"status": "PAID",
		}
		if input.Notes != "" {
			newNotes := input.Notes
			if order.Notes != "" {
				newNotes = order.Notes + " | Payment Note: " + input.Notes
			}
			updates["notes"] = newNotes
		}
		config.DB.Model(&order).Updates(updates)

		config.DB.Model(&models.OrderItem{}).Where("order_id = ? AND status NOT IN ?", order.ID, []string{"CANCELLED", "REJECTED"}).Update("status", "SERVED")
		if order.TableID != nil {
			services.UpdateTableStatus(*order.TableID)
		}
	}

	if err := config.DB.Preload("Order.Table").Preload("Order.Items.Item").Preload("Store").Preload("Waiter").First(&invoice, invoice.ID).Error; err != nil {
		utils.Error("Failed to reload invoice", zap.Error(err), zap.Uint("invoiceID", invoice.ID))
		utils.SuccessResponse(c, http.StatusCreated, invoice) // Fallback
		return
	}

	utils.Info("Checkout successful", zap.Uint("orderID", order.ID), zap.String("invoice", invoice.InvoiceNumber), zap.Float64("total", invoice.TotalAmount))
	websocket.Broadcast("ORDER_CHECKOUT", MapInvoiceToResponse(invoice))
	utils.SuccessResponse(c, http.StatusCreated, MapInvoiceToResponse(invoice))
}

func MapInvoicesToResponse(invoices []models.Invoice) []interface{} {
	response := []interface{}{}
	for _, inv := range invoices {
		response = append(response, MapInvoiceToResponse(inv))
	}
	return response
}

func MapInvoiceToResponse(inv models.Invoice) interface{} {
	tableNumber := "Take Away"
	if inv.Order.Table != nil {
		tableNumber = inv.Order.Table.Number
	}

	waiterName := "Staff"
	if inv.Waiter != nil {
		waiterName = inv.Waiter.Username
	}

	var items []interface{}
	for _, i := range inv.Order.Items {
		items = append(items, gin.H{
			"id":           i.ID,
			"item_details": i.Item,
			"quantity":     i.Quantity,
			"price":        fmt.Sprintf("%.2f", i.Price),
			"status":       i.Status,
		})
	}

	var taxDetails interface{}
	if inv.TaxDetails != "" {
		json.Unmarshal([]byte(inv.TaxDetails), &taxDetails)
	} else {
		taxDetails = make(map[string]interface{})
	}

	return gin.H{
		"id":             inv.ID,
		"invoice_number": inv.InvoiceNumber,
		"order":          inv.OrderID,
		"table_number":   tableNumber,
		"items":          items,
		"subtotal":       fmt.Sprintf("%.2f", inv.Subtotal),
		"tax_amount":     fmt.Sprintf("%.2f", inv.TaxAmount),
		"tax_details":    taxDetails,
		"total_amount":   fmt.Sprintf("%.2f", inv.TotalAmount),
		"payment_method": inv.PaymentMethod,
		"waiter":         inv.WaiterID,
		"waiter_name":    waiterName,
		"created_at":     inv.CreatedAt.Format("2006-01-02T15:04:05.999Z07:00"),
		"store_details":  inv.Store,
	}
}

func UpdateOrderItem(c *gin.Context) {
	id := c.Param("id")
	var orderItem models.OrderItem
	if err := config.DB.First(&orderItem, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order item not found")
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := config.DB.Model(&orderItem).Updates(input).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Recalculate order total
	services.UpdateOrderTotal(orderItem.OrderID)

	utils.SuccessResponse(c, http.StatusOK, orderItem)
}

func DeleteOrderItem(c *gin.Context) {
	id := c.Param("id")
	var orderItem models.OrderItem
	if err := config.DB.First(&orderItem, id).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Order item not found")
		return
	}

	orderID := orderItem.OrderID
	if err := config.DB.Delete(&orderItem).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Recalculate order total
	services.UpdateOrderTotal(orderID)

	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Item removed"})
}

func GetKitchenItems(c *gin.Context) {
	var items []models.OrderItem
	storeID := c.Query("store_id")

	query := config.DB.Preload("Item").Preload("Order.Table").
		Joins("JOIN restaurants_order ON restaurants_order.id = restaurants_orderitem.order_id").
		Where("restaurants_orderitem.status IN ?", []string{"AWAITING", "PREPARING", "READY"})

	if storeID != "" {
		query = query.Where("restaurants_order.store_id = ?", storeID)
	}

	query.Order("restaurants_orderitem.created_at asc").Find(&items)

	utils.SuccessResponse(c, http.StatusOK, items)
}

func GetInvoices(c *gin.Context) {
	var invoices []models.Invoice
	config.DB.Preload("Order.Table").Preload("Order.Items.Item").Preload("Store").Preload("Waiter").Order("created_at desc").Find(&invoices)

	utils.SuccessResponse(c, http.StatusOK, MapInvoicesToResponse(invoices))
}

func AttendItem(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Model(&models.OrderItem{}).Where("id = ?", id).Update("status", "PREPARING").Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	websocket.Broadcast("KITCHEN_UPDATED", gin.H{"item_id": id, "status": "PREPARING"})
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Item attending"})
}

func ReadyItem(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Model(&models.OrderItem{}).Where("id = ?", id).Update("status", "READY").Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	websocket.Broadcast("KITCHEN_UPDATED", gin.H{"item_id": id, "status": "READY"})
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Item ready"})
}

func RejectItem(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Note string `json:"note"`
	}
	c.ShouldBindJSON(&input)

	if err := config.DB.Model(&models.OrderItem{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":         "REJECTED",
		"rejection_note": input.Note,
	}).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	websocket.Broadcast("KITCHEN_UPDATED", gin.H{"item_id": id, "status": "REJECTED"})
	utils.SuccessResponse(c, http.StatusOK, gin.H{"message": "Item rejected"})
}
