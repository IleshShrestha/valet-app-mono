package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type RefreshToken struct {
	ID                 int64
	UserID             int64
	TokenHash          string
	Platform           sql.NullString
	DeviceName         sql.NullString
	UserAgent          sql.NullString
	IPAddress          sql.NullString
	ExpiresAt          time.Time
	RevokedAt          sql.NullTime
	LastUsedAt         sql.NullTime
	CreatedAt          time.Time
	UserEmail          string
	UserRole           string
	UserOrganizationID string
}

type RefreshTokenRepository struct{ db *sql.DB }

func (r *RefreshTokenRepository) CreateRefreshToken(ctx context.Context, userID int64, tokenHash, platform, deviceName, userAgent, ipAddress string, expiresAt time.Time) error {
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO refresh_tokens (organization_id, user_id, token_hash, platform, device_name, user_agent, ip_address, expires_at)
		SELECT organization_id, id, $2, NULLIF($3,''), NULLIF($4,''), NULLIF($5,''), NULLIF($6,'')::inet, $7
		FROM users
		WHERE id = $1
	`, userID, tokenHash, platform, deviceName, userAgent, ipAddress, expiresAt)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
func (r *RefreshTokenRepository) GetRefreshTokenByHash(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	q := `SELECT rt.id, rt.user_id, rt.token_hash, rt.platform, rt.device_name, rt.user_agent, host(rt.ip_address), rt.expires_at, rt.revoked_at, rt.last_used_at, rt.created_at, u.email, u.role, u.organization_id FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id AND u.organization_id = rt.organization_id WHERE rt.token_hash=$1`
	var rt RefreshToken
	err := r.db.QueryRowContext(ctx, q, tokenHash).Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.Platform, &rt.DeviceName, &rt.UserAgent, &rt.IPAddress, &rt.ExpiresAt, &rt.RevokedAt, &rt.LastUsedAt, &rt.CreatedAt, &rt.UserEmail, &rt.UserRole, &rt.UserOrganizationID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &rt, nil
}
func (r *RefreshTokenRepository) MarkRefreshTokenUsed(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE refresh_tokens SET last_used_at=NOW() WHERE token_hash=$1`, tokenHash)
	return err
}
func (r *RefreshTokenRepository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1 AND revoked_at IS NULL`, tokenHash)
	return err
}
func (r *RefreshTokenRepository) RevokeAllRefreshTokensForUser(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx, `UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, userID)
	return err
}
func (r *RefreshTokenRepository) DeleteExpiredRefreshTokens(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM refresh_tokens WHERE expires_at < NOW()`)
	return err
}
