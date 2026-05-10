package models

import (
	"time"
)

type BusinessConfig struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	StoreID     uint      `gorm:"uniqueIndex;not null" json:"store_id"`
	Store       Store     `gorm:"foreignKey:StoreID" json:"-"`
	ShopName    string    `gorm:"size:255" json:"shop_name"`
	Branch      string    `gorm:"size:255" json:"branch"`
	Location    string    `gorm:"size:255" json:"location"`
	Mobile      string    `gorm:"size:20" json:"mobile"`
	GSTIN       string    `gorm:"size:25" json:"gstin"`
	FSSAILicNo  string    `gorm:"size:50" json:"fssai_lic_no"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (BusinessConfig) TableName() string {
	return "core_businessconfig"
}
