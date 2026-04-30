package models

import (
	"time"
)

type Table struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Number    string    `gorm:"size:20;not null" json:"number"`
	StoreID   *uint     `gorm:"column:store_id" json:"store_id"`
	Store     Store     `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	Capacity  int       `gorm:"default:2" json:"capacity"`
	Status    string    `gorm:"size:20;default:'VACANT'" json:"status"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	PosX      float64   `gorm:"column:pos_x;default:10.0" json:"pos_x"`
	PosY      float64   `gorm:"column:pos_y;default:10.0" json:"pos_y"`
	Shape     string    `gorm:"size:10;default:'RECT'" json:"shape"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Table) TableName() string {
	return "restaurants_table"
}

type Order struct {
	ID               uint        `gorm:"primaryKey" json:"id"`
	TableID          *uint       `gorm:"column:table_id" json:"table"`
	Table            *Table      `gorm:"foreignKey:TableID" json:"table_details,omitempty"`
	StoreID          *uint       `gorm:"column:store_id" json:"store_id"`
	Store            Store       `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	WaiterID         *uint       `gorm:"column:waiter_id" json:"waiter_id"`
	Waiter           *User       `gorm:"foreignKey:WaiterID" json:"waiter,omitempty"`
	CustomerName     string      `gorm:"column:customer_name;size:255" json:"customer_name"`
	CustomerMobile   string      `gorm:"column:customer_mobile;size:20" json:"customer_mobile"`
	Status           string      `gorm:"size:20;default:'ORDER_TAKEN'" json:"status"`
	NumberOfPersons  int         `gorm:"column:number_of_persons;default:1" json:"number_of_persons"`
	OrderType        string      `gorm:"column:order_type;size:20;default:'DINE_IN'" json:"order_type"`
	TotalAmount      float64     `gorm:"column:total_amount;type:decimal(10,2);default:0.00" json:"total_amount"`
	Notes            string      `gorm:"type:text" json:"notes"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
	Items            []OrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	Invoice          *Invoice    `gorm:"foreignKey:OrderID" json:"invoice,omitempty"`
}

func (Order) TableName() string {
	return "restaurants_order"
}

type OrderItem struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	OrderID       uint      `gorm:"column:order_id" json:"order_id"`
	ItemID        uint      `gorm:"column:item_id" json:"item_id"`
	Item          Item      `gorm:"foreignKey:ItemID" json:"item,omitempty"`
	Quantity      int       `gorm:"default:1" json:"quantity"`
	Price         float64   `gorm:"type:decimal(10,2);not null" json:"price"`
	Status        string    `gorm:"size:20;default:'ORDERED'" json:"status"`
	Notes         string    `gorm:"size:255" json:"notes"`
	RejectionNote string    `gorm:"column:rejection_note;type:text" json:"rejection_note"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (OrderItem) TableName() string {
	return "restaurants_orderitem"
}

type Reservation struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	TableID         uint      `gorm:"column:table_id" json:"table_id"`
	Table           Table     `gorm:"foreignKey:TableID" json:"table,omitempty"`
	StoreID         *uint     `gorm:"column:store_id" json:"store_id"`
	Store           Store     `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	CustomerName    string    `gorm:"column:customer_name;size:255;not null" json:"customer_name"`
	CustomerPhone   string    `gorm:"column:customer_phone;size:20;not null" json:"customer_phone"`
	ReservationTime time.Time `gorm:"column:reservation_time;not null" json:"reservation_time"`
	NumberOfGuests  int       `gorm:"column:number_of_guests;not null" json:"number_of_guests"`
	Status          string    `gorm:"size:20;default:'CONFIRMED'" json:"status"`
	Notes           string    `gorm:"type:text" json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (Reservation) TableName() string {
	return "restaurants_reservation"
}

type Invoice struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	InvoiceNumber string    `gorm:"column:invoice_number;size:50;unique;not null" json:"invoice_number"`
	StoreID       *uint     `gorm:"column:store_id" json:"store_id"`
	Store         Store     `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	OrderID       uint      `gorm:"column:order_id;unique;not null" json:"order_id"`
	Order         Order     `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	Subtotal      float64   `gorm:"type:decimal(10,2);not null" json:"subtotal"`
	TaxAmount     float64   `gorm:"column:tax_amount;type:decimal(10,2);default:0.00" json:"tax_amount"`
	TaxDetails    string    `gorm:"column:tax_details;type:jsonb;default:'{}'" json:"tax_details"`
	TotalAmount   float64   `gorm:"column:total_amount;type:decimal(10,2);not null" json:"total_amount"`
	PaymentMethod string    `gorm:"column:payment_method;size:20;default:'EXTERNAL'" json:"payment_method"`
	WaiterID      *uint     `gorm:"column:waiter_id" json:"waiter_id"`
	Waiter        *User     `gorm:"foreignKey:WaiterID" json:"waiter,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (Invoice) TableName() string {
	return "restaurants_invoice"
}
