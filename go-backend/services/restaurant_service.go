package services

import (
	"fmt"
	"mario-backend/config"
	"mario-backend/models"
	"math/rand"
	"time"
)

var TerminalStatuses = []string{"PAID", "CANCELLED", "COMPLETED", "RETURNED", "REJECTED"}

func UpdateTableStatus(tableID uint) error {
	var table models.Table
	if err := config.DB.First(&table, tableID).Error; err != nil {
		return err
	}

	var totalPersons int64
	config.DB.Model(&models.Order{}).
		Where("table_id = ? AND status NOT IN ?", tableID, TerminalStatuses).
		Select("SUM(number_of_persons)").
		Row().Scan(&totalPersons)

	newStatus := "VACANT"
	if totalPersons > 0 {
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
		config.DB.Model(&models.Reservation{}).
			Where("table_id = ? AND status = ? AND reservation_time >= ? AND reservation_time <= ?", 
				tableID, "CONFIRMED", now, windowEnd).
			Count(&count)
		if count > 0 {
			newStatus = "RESERVED"
		}
	}

	return config.DB.Model(&table).Update("status", newStatus).Error
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
	
	return config.DB.Model(&models.Order{}).Where("id = ?", orderID).Update("total_amount", total).Error
}
func SafeUint(ptr *uint) uint {
	if ptr == nil {
		return 0
	}
	return *ptr
}
