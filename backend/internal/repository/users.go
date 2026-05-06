package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type User struct {
	ID        int64     `json:"id"`
	Role      string    `json:"role"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserRepository struct {
	db *sql.DB
}

func (u *UserRepository) Create(ctx context.Context, user *User) error {
	query := `
	INSERT INTO users (role, first_name, last_name, email, password) 
	VALUES ($1, $2, $3, $4, $5) 
	RETURNING id, created_at, updated_at`

	err := u.db.QueryRowContext(
		ctx,
		query,
		user.Role,
		user.FirstName,
		user.LastName,
		user.Email,
		user.Password,
	).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.UpdatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (u *UserRepository) GetById(ctx context.Context, id int64) (*User, error) {

	query := `
	SELECT id, role, first_name, last_name, email
	FROM users
	WHERE id = $1
	`
	var currentUser User

	err := u.db.QueryRowContext(ctx, query, id).Scan(
		&currentUser.ID,
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

func (u *UserRepository) GetAll(ctx context.Context) ([]*User, error) {
	query := `
	SELECT id, role, first_name, last_name, email, created_at, updated_at
	FROM users
	ORDER BY id
	`
	rows, err := u.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]*User, 0)
	for rows.Next() {
		var user User
		err := rows.Scan(
			&user.ID,
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

func (u *UserRepository) Update(ctx context.Context, id int64, role, firstName, lastName, email string, password *string) error {
	if password != nil {
		query := `
		UPDATE users
		SET role = $1, first_name = $2, last_name = $3, email = $4, password = $5
		WHERE id = $6
		`
		res, err := u.db.ExecContext(ctx, query, role, firstName, lastName, email, *password, id)
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
	`
	res, err := u.db.ExecContext(ctx, query, role, firstName, lastName, email, id)
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

func (u *UserRepository) Delete(ctx context.Context, id int64) error {
	res, err := u.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
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
