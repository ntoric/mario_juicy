package models

import (
	"time"
)

type User struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	Password    string     `gorm:"size:128;not null" json:"-"`
	LastLogin   *time.Time `json:"last_login"`
	IsSuperuser bool       `gorm:"default:false" json:"is_superuser"`
	Username    string     `gorm:"size:150;unique;not null" json:"username"`
	FirstName   string     `gorm:"size:150" json:"first_name"`
	LastName    string     `gorm:"size:150" json:"last_name"`
	Email       string     `gorm:"size:254" json:"email"`
	IsStaff     bool       `gorm:"default:false" json:"is_staff"`
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	DateJoined  time.Time  `gorm:"default:now()" json:"date_joined"`
	StoreID     *uint      `gorm:"column:store_id" json:"store_id"`
	Store       Store      `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	Groups      []Group    `gorm:"many2many:users_user_groups;foreignKey:ID;joinForeignKey:user_id;References:ID;joinReferences:group_id" json:"groups"`
}

func (User) TableName() string {
	return "users_user"
}

type Group struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"size:150;unique;not null" json:"name"`
}

func (Group) TableName() string {
	return "auth_group"
}

