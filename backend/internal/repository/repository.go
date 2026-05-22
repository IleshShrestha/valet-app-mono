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
		GetById(ctx context.Context, id int64, organizationID string) (*User, error)
		GetAll(ctx context.Context, organizationID string) ([]*User, error)
		Update(ctx context.Context, id int64, organizationID, role, firstName, lastName, email string, password *string) error
		Delete(ctx context.Context, id int64, organizationID string) error
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
		GetAll(ctx context.Context, organizationID string) ([]*Shift, error)
		GetAllByAssignedUser(ctx context.Context, userID int64, organizationID string) ([]*Shift, error)
		GetByID(ctx context.Context, id int64, organizationID string) (*Shift, error)
		Update(ctx context.Context, shift *Shift) error
		Delete(ctx context.Context, id int64, organizationID string) error
	}
	Locations interface {
		GetByID(ctx context.Context, id int64, organizationID string) (*Location, error)
		ListSummaries(ctx context.Context, organizationID string) ([]LocationSummary, error)
		Create(ctx context.Context, loc *Location) error
	}
}

func NewRepository(db *sql.DB) Repository {
	return Repository{Users: &UserRepository{db}, RefreshTokens: &RefreshTokenRepository{db}, Shifts: &ShiftRepository{db}, Locations: &LocationRepository{db}}
}
