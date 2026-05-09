package models

import (
	"time"
)

type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	StoreID   uint      `gorm:"column:store_id;not null" json:"store_id"`
	Store     Store     `gorm:"foreignKey:StoreID" json:"-"`
	UserID    *uint     `gorm:"column:user_id" json:"user_id"` // Optional: If null, it's for all users of the store
	Title     string    `gorm:"size:255;not null" json:"title"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	Type      string    `gorm:"size:50;not null" json:"type"` // e.g., ORDER_CREATED, ORDER_STATUS_CHANGED, PLAN_EXPIRY
	Link      string    `gorm:"size:255" json:"link"`       // Optional link to navigate to
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Notification) TableName() string {
	return "core_notification"
}
