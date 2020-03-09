package service

import (
	"errors"
	"fmt"

	"github.com/jinzhu/gorm"
	"github.com/stamhoofd/stamhoofd/backend/auth/models"
)

func RegisterConfirm(db *gorm.DB, email, token string) (*models.LoggedInResponse, error) {
	user := &models.User{}
	err := db.Where(&models.User{
		Email:             email,
		RegistrationToken: token,
	}).First(user).Error
	if err != nil {
		return nil, fmt.Errorf("could not retrieve user %s: %w", email, err)
	}

	if user.RegistrationToken != token {
		return nil, errors.New("invalid registration token")
	}

	return saveLogin(db, user)
}
