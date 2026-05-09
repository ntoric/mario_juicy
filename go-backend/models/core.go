package models

import (
	"time"
)

type TaxConfiguration struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Name          string    `gorm:"size:100;default:'Default Tax Configuration'" json:"name"`
	StoreID       *uint     `gorm:"column:store_id" json:"store_id"`
	Store         Store     `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	TaxType       string    `gorm:"column:tax_type;size:20;default:'EXEMPTED'" json:"tax_type"`
	IsGSTEnabled  bool      `gorm:"column:is_gst_enabled;default:false" json:"is_gst_enabled"`
	CGSTRate      float64   `gorm:"column:cgst_rate;type:decimal(5,2);default:0.00" json:"cgst_rate"`
	SGSTRate      float64   `gorm:"column:sgst_rate;type:decimal(5,2);default:0.00" json:"sgst_rate"`
	IGSTRate      float64   `gorm:"column:igst_rate;type:decimal(5,2);default:0.00" json:"igst_rate"`
	IsCESSEnabled bool      `gorm:"column:is_cess_enabled;default:false" json:"is_cess_enabled"`
	CESSRate      float64   `gorm:"column:cess_rate;type:decimal(5,2);default:0.00" json:"cess_rate"`
	IsActive      bool      `gorm:"default:true" json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (TaxConfiguration) TableName() string {
	return "core_taxconfiguration"
}

type SupportSettings struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Email     string    `gorm:"size:254;default:'support@mario.com'" json:"email"`
	Phone     string    `gorm:"size:20;default:'+91 99999 99999'" json:"phone"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SupportSettings) TableName() string {
	return "core_supportsettings"
}
