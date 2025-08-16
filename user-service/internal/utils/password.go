package utils

import (
	"errors"
	"unicode"

	"github.com/Sourav01112/user-service/internal/config"
	"golang.org/x/crypto/bcrypt"
)

type PasswordManager struct {
	config *config.Config
}

func NewPasswordManager(cfg *config.Config) *PasswordManager {
	return &PasswordManager{
		config: cfg,
	}
}

func (p *PasswordManager) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), p.config.Security.BcryptRounds)
	return string(bytes), err
}

func (p *PasswordManager) VerifyPassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

func (p *PasswordManager) ValidatePassword(password string) error {
	if len(password) < p.config.Security.PasswordMinLength {
		return errors.New("password too short")
	}

	var (
		hasUpper   = false
		hasLower   = false
		hasNumber  = false
		hasSpecial = false
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return errors.New("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return errors.New("password must contain at least one lowercase letter")
	}
	if !hasNumber {
		return errors.New("password must contain at least one number")
	}
	if !hasSpecial {
		return errors.New("password must contain at least one special character")
	}

	return nil
}
