package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type AssignedUser struct {
	ID           int64      `json:"id"`
	Role         string     `json:"role"`
	FirstName    string     `json:"first_name"`
	LastName     string     `json:"last_name"`
	Email        string     `json:"email"`
	CheckInTime  *time.Time `json:"check_in_time"`
	CheckOutTime *time.Time `json:"check_out_time"`
}

type Shift struct {
	ID            int64          `json:"id"`
	Title         string         `json:"title"`
	AssignedUsers []AssignedUser `json:"assigned_users"`
	Date          string         `json:"date"`
	LocationID    int64          `json:"location_id"`
	StartTime     string         `json:"start_time"`
	EndTime       string         `json:"end_time"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
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
	SELECT
		s.id,
		s.title,
		s.date,
		s.location_id,
		s.start_time,
		s.end_time,
		s.created_at,
		s.updated_at,
		u.id,
		u.role,
		u.first_name,
		u.last_name,
		u.email,
		su.check_in_time,
		su.check_out_time
	FROM shifts s
	LEFT JOIN shift_users su ON su.shift_id = s.id
	LEFT JOIN users u ON u.id = su.user_id
	ORDER BY s.id, u.id
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	shiftMap := make(map[int64]*Shift)
	shifts := make([]*Shift, 0)
	for rows.Next() {
		var shiftID int64
		var title, date, startTime, endTime string
		var locationID int64
		var createdAt, updatedAt time.Time
		var userID sql.NullInt64
		var role, firstName, lastName, email sql.NullString
		var checkInTime, checkOutTime sql.NullTime
		err := rows.Scan(
			&shiftID,
			&title,
			&date,
			&locationID,
			&startTime,
			&endTime,
			&createdAt,
			&updatedAt,
			&userID,
			&role,
			&firstName,
			&lastName,
			&email,
			&checkInTime,
			&checkOutTime,
		)
		if err != nil {
			return nil, err
		}

		shift, ok := shiftMap[shiftID]
		if !ok {
			shift = &Shift{
				ID:            shiftID,
				Title:         title,
				Date:          date,
				LocationID:    locationID,
				StartTime:     startTime,
				EndTime:       endTime,
				CreatedAt:     createdAt,
				UpdatedAt:     updatedAt,
				AssignedUsers: make([]AssignedUser, 0),
			}
			shiftMap[shiftID] = shift
			shifts = append(shifts, shift)
		}

		if userID.Valid {
			assignedUser := AssignedUser{
				ID:        userID.Int64,
				Role:      role.String,
				FirstName: firstName.String,
				LastName:  lastName.String,
				Email:     email.String,
			}
			if checkInTime.Valid {
				assignedUser.CheckInTime = &checkInTime.Time
			}
			if checkOutTime.Valid {
				assignedUser.CheckOutTime = &checkOutTime.Time
			}
			shift.AssignedUsers = append(shift.AssignedUsers, assignedUser)
		}
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
