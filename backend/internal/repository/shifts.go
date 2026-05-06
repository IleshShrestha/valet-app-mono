package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type Shift struct {
	ID         int64     `json:"id"`
	Title      string    `json:"title"`
	Users      []*User   `json:"users"`
	Date       string    `json:"date"`
	LocationID int64     `json:"location_id"`
	StartTime  string    `json:"start_time"`
	EndTime    string    `json:"end_time"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type ShiftRepository struct {
	db *sql.DB
}

func (s *ShiftRepository) Create(ctx context.Context, shift *Shift) error {
	query := `
	INSERT INTO shifts (title, date, location_id, start_time, end_time) 
	VALUES ($1, $2, $3, $4, $5)
	RETURNING id, created_at, updated_at
`

	err := s.db.QueryRowContext(
		ctx,
		query,
		shift.Title,
		shift.Date,
		shift.LocationID,
		shift.StartTime,
		shift.EndTime,
	).Scan(&shift.ID, &shift.CreatedAt, &shift.UpdatedAt)

	if err != nil {
		return err
	}
	return nil
}

func (s *ShiftRepository) GetAll(ctx context.Context) ([]*Shift, error) {
	query := `
	SELECT id, title, date, location_id, start_time, end_time, created_at, updated_at
	FROM shifts
	ORDER BY id
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	shifts := make([]*Shift, 0)
	for rows.Next() {
		var shift Shift
		err := rows.Scan(
			&shift.ID,
			&shift.Title,
			&shift.Date,
			&shift.LocationID,
			&shift.StartTime,
			&shift.EndTime,
			&shift.CreatedAt,
			&shift.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		shifts = append(shifts, &shift)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return shifts, nil
}

func (s *ShiftRepository) GetByID(ctx context.Context, id int64) (*Shift, error) {
	query := `
	SELECT id, title, date, location_id, start_time, end_time, created_at, updated_at
	FROM shifts
	WHERE id = $1
	`
	var shift Shift
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&shift.ID,
		&shift.Title,
		&shift.Date,
		&shift.LocationID,
		&shift.StartTime,
		&shift.EndTime,
		&shift.CreatedAt,
		&shift.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &shift, nil
}

func (s *ShiftRepository) Update(ctx context.Context, shift *Shift) error {
	query := `
	UPDATE shifts
	SET title = $1, date = $2, location_id = $3, start_time = $4, end_time = $5
	WHERE id = $6
	`
	res, err := s.db.ExecContext(ctx, query,
		shift.Title,
		shift.Date,
		shift.LocationID,
		shift.StartTime,
		shift.EndTime,
		shift.ID,
	)
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

func (s *ShiftRepository) Delete(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM shifts WHERE id = $1`, id)
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
