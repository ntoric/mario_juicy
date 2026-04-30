package models

import (
	"time"
)

type Store struct {
	ID                     uint      `gorm:"primaryKey" json:"id"`
	Name                   string    `gorm:"size:255;not null" json:"name"`
	Address                string    `gorm:"type:text;not null" json:"address"`
	Phone                  string    `gorm:"size:20" json:"phone"`
	Email                  string    `gorm:"size:254" json:"email"`
	GSTNumber              string    `gorm:"column:gst_number;size:15" json:"gst_number"`
	InvoicePrefix          string    `gorm:"column:invoice_prefix;size:10;default:'INV'" json:"invoice_prefix"`
	Logo                   string    `gorm:"size:100" json:"logo"`
	Location               string    `gorm:"size:255" json:"location"`
	FSSAILicNo             string    `gorm:"column:fssai_lic_no;size:50" json:"fssai_lic_no"`
	Mobile                 string    `gorm:"size:20" json:"mobile"`
	IsActive               bool      `gorm:"default:true" json:"is_active"`
	IsKitchenStepEnabled   bool      `gorm:"column:is_kitchen_step_enabled;default:true" json:"is_kitchen_step_enabled"`
	IsTakeAwayEnabled      bool      `gorm:"column:is_take_away_enabled;default:true" json:"is_take_away_enabled"`
	IsReservationsEnabled  bool      `gorm:"column:is_reservations_enabled;default:true" json:"is_reservations_enabled"`
	ThermalPrinterSize     string    `gorm:"column:thermal_printer_size;size:10;default:'3_INCH'" json:"thermal_printer_size"`
	ThermalPrinterName     string    `gorm:"column:thermal_printer_name;size:255" json:"thermal_printer_name"`
	ThermalPrinterVendorID string    `gorm:"column:thermal_printer_vendor_id;size:20" json:"thermal_printer_vendor_id"`
	ThermalPrinterProductID string   `gorm:"column:thermal_printer_product_id;size:20" json:"thermal_printer_product_id"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

func (Store) TableName() string {
	return "stores_store"
}
