package models

import (
	"time"
)

type Category struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	StoreID   *uint      `gorm:"column:store_id" json:"store_id"`
	Store     Store      `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	Image     string    `gorm:"size:100" json:"image"`
	IsEnabled bool      `gorm:"default:true" json:"is_enabled"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Category) TableName() string {
	return "catalogs_category"
}

type Item struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CategoryID  *uint     `gorm:"column:category_id" json:"category_id"`
	Category    Category  `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	StoreID     *uint     `gorm:"column:store_id" json:"store_id"`
	Store       Store     `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	Code        string    `gorm:"size:50" json:"code"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Image       string    `gorm:"size:100" json:"image"`
	Description string    `gorm:"type:text" json:"description"`
	Price       float64   `gorm:"type:decimal(10,2);default:0.00" json:"price"`
	IsEnabled   bool      `gorm:"default:true" json:"is_enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Item) TableName() string {
	return "catalogs_item"
}
