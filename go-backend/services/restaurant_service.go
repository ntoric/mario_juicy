package services

import (
	"fmt"
	"mario-backend/config"
	"mario-backend/models"
	"mario-backend/websocket"
	"math/rand"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var TerminalStatuses = []string{"PAID", "CANCELLED", "COMPLETED", "RETURNED", "REJECTED"}

func UpdateTableStatus(tableID uint) error {
	return UpdateTableStatusWithDB(config.DB, tableID)
}

func UpdateTableStatusWithDB(db *gorm.DB, tableID uint) error {
	var table models.Table
	if err := db.First(&table, tableID).Error; err != nil {
		return err
	}

	// Check for any active orders on this table
	var activeOrdersCount int64
	db.Model(&models.Order{}).
		Where("table_id = ? AND order_type = 'DINE_IN' AND status NOT IN ?", tableID, TerminalStatuses).
		Count(&activeOrdersCount)

	totalPersons := GetTableCurrentOccupancyWithDB(db, tableID, 0)

	newStatus := "VACANT"
	if activeOrdersCount > 0 {
		if int(totalPersons) < table.Capacity {
			newStatus = "PARTIALLY_OCCUPIED"
		} else {
			newStatus = "OCCUPIED"
		}
	}

	// Logic for reservations could be added here
	if newStatus == "VACANT" {
		var count int64
		now := time.Now()
		windowEnd := now.Add(30 * time.Minute)
		db.Model(&models.Reservation{}).
			Where("table_id = ? AND status = ? AND reservation_time >= ? AND reservation_time <= ?", 
				tableID, "CONFIRMED", now, windowEnd).
			Count(&count)
		if count > 0 {
			newStatus = "RESERVED"
		}
	}

	if err := db.Model(&table).Update("status", newStatus).Error; err != nil {
		return err
	}

	websocket.Broadcast("TABLE_UPDATED", gin.H{
		"table_id": tableID,
		"status":   newStatus,
	})

	return nil
}

func GetTableCurrentOccupancy(tableID uint, excludeOrderID uint) int {
	return GetTableCurrentOccupancyWithDB(config.DB, tableID, excludeOrderID)
}

func GetTableCurrentOccupancyWithDB(db *gorm.DB, tableID uint, excludeOrderID uint) int {
	var totalPersons int64
	query := db.Model(&models.Order{}).
		Where("table_id = ? AND order_type = 'DINE_IN' AND status NOT IN ?", tableID, TerminalStatuses)
	if excludeOrderID > 0 {
		query = query.Where("id != ?", excludeOrderID)
	}
	query.Select("COALESCE(SUM(number_of_persons), 0)").Row().Scan(&totalPersons)
	return int(totalPersons)
}

func GenerateInvoiceNumber() string {
	prefix := "INV"
	timestamp := time.Now().Format("200601021504")
	randomStr := fmt.Sprintf("%04d", rand.Intn(10000))
	return fmt.Sprintf("%s-%s-%s", prefix, timestamp, randomStr)
}

func UpdateOrderTotal(orderID uint) error {
	var total float64
	config.DB.Model(&models.OrderItem{}).
		Where("order_id = ? AND status != ?", orderID, "CANCELLED").
		Select("SUM(price * quantity)").
		Row().Scan(&total)
	
	if err := config.DB.Model(&models.Order{}).Where("id = ?", orderID).Update("total_amount", total).Error; err != nil {
		return err
	}

	websocket.Broadcast("ORDER_UPDATED", gin.H{
		"order_id":     orderID,
		"total_amount": total,
	})

	return nil
}
func SafeUint(ptr *uint) uint {
	if ptr == nil {
		return 0
	}
	return *ptr
}
