package repository

import (
	"context"
	"database/sql"
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
	ID             int64          `json:"id"`
	OrganizationID string         `json:"organization_id,omitempty"`
	Title          string         `json:"title"`
	AssignedUsers  []AssignedUser `json:"assigned_users"`
	Date           string         `json:"date"`
	LocationID     int64          `json:"location_id"`
	StartTime      string         `json:"start_time"`
	EndTime        string         `json:"end_time"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

type ShiftRepository struct {
	db *sql.DB
}

func (s *ShiftRepository) Create(ctx context.Context, shift *Shift) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
	INSERT INTO shifts (organization_id, title, location_id, start_at, end_at)
	VALUES (
		$1,
		$2,
		$3,
		($4::date + $5::time) AT TIME ZONE 'UTC',
		CASE
			WHEN $6::time <= $5::time THEN (($4::date + 1) + $6::time) AT TIME ZONE 'UTC'
			ELSE ($4::date + $6::time) AT TIME ZONE 'UTC'
		END
	)
	RETURNING id, organization_id, created_at, updated_at
`

	err = tx.QueryRowContext(
		ctx,
		query,
		shift.OrganizationID,
		shift.Title,
		shift.LocationID,
		shift.Date,
		shift.StartTime,
		shift.EndTime,
	).Scan(&shift.ID, &shift.OrganizationID, &shift.CreatedAt, &shift.UpdatedAt)

	if err != nil {
		return err
	}
	if err := syncShiftUsers(ctx, tx, shift.ID, shift.OrganizationID, shift.AssignedUsers); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *ShiftRepository) GetAll(ctx context.Context, organizationID string) ([]*Shift, error) {
	query := `
	SELECT
		s.id,
		s.title,
		to_char(s.start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
		s.location_id,
		to_char(s.start_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS start_time,
		to_char(s.end_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS end_time,
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
	LEFT JOIN shift_users su ON su.shift_id = s.id AND su.organization_id = s.organization_id
	LEFT JOIN users u ON u.id = su.user_id AND u.organization_id = su.organization_id
	WHERE s.organization_id = $1
	ORDER BY s.id, u.id
	`
	rows, err := s.db.QueryContext(ctx, query, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanShiftRows(rows)
}

func scanShiftRows(rows *sql.Rows) ([]*Shift, error) {
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

func (s *ShiftRepository) GetAllByAssignedUser(ctx context.Context, userID int64, organizationID string) ([]*Shift, error) {
	query := `
	SELECT
		s.id,
		s.title,
		to_char(s.start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
		s.location_id,
		to_char(s.start_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS start_time,
		to_char(s.end_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS end_time,
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
	LEFT JOIN shift_users su ON su.shift_id = s.id AND su.organization_id = s.organization_id
	LEFT JOIN users u ON u.id = su.user_id AND u.organization_id = su.organization_id
	WHERE EXISTS (
		SELECT 1
		FROM shift_users assigned
		WHERE assigned.shift_id = s.id
			AND assigned.organization_id = s.organization_id
			AND assigned.user_id = $1
	)
	AND s.organization_id = $2
	ORDER BY s.id, u.id
	`
	rows, err := s.db.QueryContext(ctx, query, userID, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanShiftRows(rows)
}

func (s *ShiftRepository) GetByID(ctx context.Context, id int64, organizationID string) (*Shift, error) {
	query := `
	SELECT
		s.id,
		s.title,
		to_char(s.start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
		s.location_id,
		to_char(s.start_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS start_time,
		to_char(s.end_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS end_time,
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
	LEFT JOIN shift_users su ON su.shift_id = s.id AND su.organization_id = s.organization_id
	LEFT JOIN users u ON u.id = su.user_id AND u.organization_id = su.organization_id
	WHERE s.id = $1
		AND s.organization_id = $2
	ORDER BY u.id
	`
	rows, err := s.db.QueryContext(ctx, query, id, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shift *Shift
	for rows.Next() {
		var shiftID int64
		var title, date, startTime, endTime string
		var locationID int64
		var createdAt, updatedAt time.Time
		var userID sql.NullInt64
		var role, firstName, lastName, email sql.NullString
		var checkInTime, checkOutTime sql.NullTime
		if err := rows.Scan(
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
		); err != nil {
			return nil, err
		}
		if shift == nil {
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
	if shift == nil {
		return nil, ErrNotFound
	}
	return shift, nil
}

func (s *ShiftRepository) Update(ctx context.Context, shift *Shift) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
	UPDATE shifts
	SET title = $1,
		location_id = $2,
		start_at = ($3::date + $4::time) AT TIME ZONE 'UTC',
		end_at = CASE
			WHEN $5::time <= $4::time THEN (($3::date + 1) + $5::time) AT TIME ZONE 'UTC'
			ELSE ($3::date + $5::time) AT TIME ZONE 'UTC'
		END,
		updated_at = NOW()
	WHERE id = $6
		AND organization_id = $7
	`
	res, err := tx.ExecContext(ctx, query,
		shift.Title,
		shift.LocationID,
		shift.Date,
		shift.StartTime,
		shift.EndTime,
		shift.ID,
		shift.OrganizationID,
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
	if err := syncShiftUsers(ctx, tx, shift.ID, shift.OrganizationID, shift.AssignedUsers); err != nil {
		return err
	}
	return tx.Commit()
}

func syncShiftUsers(ctx context.Context, tx *sql.Tx, shiftID int64, organizationID string, assignedUsers []AssignedUser) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM shift_users WHERE shift_id = $1 AND organization_id = $2`, shiftID, organizationID); err != nil {
		return err
	}

	seen := make(map[int64]struct{})
	for _, user := range assignedUsers {
		if user.ID <= 0 {
			continue
		}
		if _, ok := seen[user.ID]; ok {
			continue
		}
		seen[user.ID] = struct{}{}
		res, err := tx.ExecContext(ctx, `
			INSERT INTO shift_users (organization_id, shift_id, user_id)
			SELECT s.organization_id, s.id, u.id
			FROM shifts s
			JOIN users u ON u.id = $2 AND u.organization_id = s.organization_id
			WHERE s.id = $1
				AND s.organization_id = $3
		`, shiftID, user.ID, organizationID)
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
	}
	return nil
}

func (s *ShiftRepository) Delete(ctx context.Context, id int64, organizationID string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM shifts WHERE id = $1 AND organization_id = $2`, id, organizationID)
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
