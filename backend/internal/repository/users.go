package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type User struct {
	ID             int64     `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Role           string    `json:"role"`
	FirstName      string    `json:"first_name"`
	LastName       string    `json:"last_name"`
	Email          string    `json:"email"`
	Password       string    `json:"-"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type UserRepository struct {
	db *sql.DB
}

func (u *UserRepository) Create(ctx context.Context, user *User) error {
	query := `
	INSERT INTO users (organization_id, role, first_name, last_name, email, password_hash)
	VALUES (COALESCE(NULLIF($1, '')::uuid, '00000000-0000-0000-0000-000000000001'), $2, $3, $4, $5, $6)
	RETURNING id, organization_id, created_at, updated_at`

	err := u.db.QueryRowContext(
		ctx,
		query,
		user.OrganizationID,
		user.Role,
		user.FirstName,
		user.LastName,
		user.Email,
		user.Password,
	).Scan(
		&user.ID,
		&user.OrganizationID,
		&user.CreatedAt,
		&user.UpdatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (u *UserRepository) GetById(ctx context.Context, id int64, organizationID string) (*User, error) {

	query := `
	SELECT id, organization_id, role, first_name, last_name, email
	FROM users
	WHERE id = $1
		AND organization_id = $2
	`
	var currentUser User

	err := u.db.QueryRowContext(ctx, query, id, organizationID).Scan(
		&currentUser.ID,
		&currentUser.OrganizationID,
		&currentUser.Role,
		&currentUser.FirstName,
		&currentUser.LastName,
		&currentUser.Email)
	if err != nil {
		switch {

		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrNotFound
		default:
			return nil, err
		}

	}
	return &currentUser, nil
}

func (u *UserRepository) GetAll(ctx context.Context, organizationID string) ([]*User, error) {
	query := `
	SELECT id, organization_id, role, first_name, last_name, email, created_at, updated_at
	FROM users
	WHERE organization_id = $1
	ORDER BY id
	`
	rows, err := u.db.QueryContext(ctx, query, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]*User, 0)
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID,
			&user.OrganizationID,
			&user.Role,
			&user.FirstName,
			&user.LastName,
			&user.Email,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, &user)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func (u *UserRepository) Update(ctx context.Context, id int64, organizationID, role, firstName, lastName, email string, password *string) error {
	if password != nil {
		query := `
		UPDATE users
		SET role = $1, first_name = $2, last_name = $3, email = $4, password_hash = $5
		WHERE id = $6
			AND organization_id = $7
		`
		res, err := u.db.ExecContext(ctx, query, role, firstName, lastName, email, *password, id, organizationID)
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

	query := `
	UPDATE users
	SET role = $1, first_name = $2, last_name = $3, email = $4
	WHERE id = $5
		AND organization_id = $6
	`
	res, err := u.db.ExecContext(ctx, query, role, firstName, lastName, email, id, organizationID)
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

func (u *UserRepository) Delete(ctx context.Context, id int64, organizationID string) error {
	res, err := u.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1 AND organization_id = $2`, id, organizationID)
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

func (u *UserRepository) GetByEmailWithPassword(ctx context.Context, email string) (*User, error) {
	query := `SELECT id, organization_id, role, email, password_hash FROM users WHERE lower(email) = lower($1)`
	var currentUser User
	err := u.db.QueryRowContext(ctx, query, email).Scan(&currentUser.ID, &currentUser.OrganizationID, &currentUser.Role, &currentUser.Email, &currentUser.Password)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &currentUser, nil
}
