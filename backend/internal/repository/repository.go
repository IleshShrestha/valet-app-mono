package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound = errors.New("record not found")
)

type Repository struct {
	Users interface {
		Create(ctx context.Context, user *User) error
		GetById(ctx context.Context, id int64) (*User, error)
		GetAll(ctx context.Context) ([]*User, error)
		Update(ctx context.Context, id int64, role, firstName, lastName, email string, password *string) error
		Delete(ctx context.Context, id int64) error
		GetByEmailWithPassword(ctx context.Context, email string) (*User, error)
	}
	RefreshTokens interface {
		CreateRefreshToken(ctx context.Context, userID int64, tokenHash, platform, deviceName, userAgent, ipAddress string, expiresAt time.Time) error
		GetRefreshTokenByHash(ctx context.Context, tokenHash string) (*RefreshToken, error)
		MarkRefreshTokenUsed(ctx context.Context, tokenHash string) error
		RevokeRefreshToken(ctx context.Context, tokenHash string) error
		RevokeAllRefreshTokensForUser(ctx context.Context, userID int64) error
		DeleteExpiredRefreshTokens(ctx context.Context) error
	}
	Shifts interface {
		Create(ctx context.Context, shift *Shift) error
		GetAll(ctx context.Context) ([]*Shift, error)
		GetByID(ctx context.Context, id int64) (*Shift, error)
		Update(ctx context.Context, shift *Shift) error
		Delete(ctx context.Context, id int64) error
	}
	Locations interface {
		GetByID(ctx context.Context, id int64) (*Location, error)
		ListSummaries(ctx context.Context) ([]LocationSummary, error)
		Create(ctx context.Context, loc *Location) error
	}
}

func NewRepository(db *sql.DB) Repository {
	return Repository{Users: &UserRepository{db}, RefreshTokens: &RefreshTokenRepository{db}, Shifts: &ShiftRepository{db}, Locations: &LocationRepository{db}}
}
