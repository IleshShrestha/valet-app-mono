package repository

import (
	"context"
	"database/sql"
	"math"
	"time"
)

// AssignedUser is a worker attached to a segment, with their check-in/out state.
type AssignedUser struct {
	ID           int64      `json:"id"`
	Role         string     `json:"role"`
	FirstName    string     `json:"first_name"`
	LastName     string     `json:"last_name"`
	Email        string     `json:"email"`
	CheckInTime  *time.Time `json:"check_in_time"`
	CheckOutTime *time.Time `json:"check_out_time"`
}

// Segment is one worked block within a service day (e.g. morning or evening).
type Segment struct {
	ID            int64          `json:"id"`
	Name          string         `json:"name"`
	StartTime     string         `json:"start_time"`
	EndTime       string         `json:"end_time"`
	Hours         float64        `json:"hours"`
	AssignedUsers []AssignedUser `json:"assigned_users"`
}

// ServiceDay is one billable engagement at one location on one date.
type ServiceDay struct {
	ID             int64     `json:"id"`
	OrganizationID string    `json:"organization_id,omitempty"`
	Title          string    `json:"title"`
	LocationID     int64     `json:"location_id"`
	LocationName   string    `json:"location_name"`
	Date           string    `json:"date"`
	IsHoliday      bool      `json:"is_holiday"`
	HolidayName    string    `json:"holiday_name"`
	Status         string    `json:"status"`
	Segments       []Segment `json:"segments"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ServiceDayRepository struct {
	db *sql.DB
}

// serviceDaySelect is the shared projection: one row per (day, segment, user).
// Callers append a WHERE clause and ORDER BY.
const serviceDaySelect = `
SELECT
	sd.id, sd.title, sd.location_id, l.name AS location_name,
	to_char(sd.service_date, 'YYYY-MM-DD') AS date,
	sd.is_holiday, sd.holiday_name, sd.status, sd.created_at, sd.updated_at,
	seg.id, seg.name,
	to_char(seg.start_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS start_time,
	to_char(seg.end_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS end_time,
	EXTRACT(EPOCH FROM (seg.end_at - seg.start_at)) / 3600.0 AS hours,
	u.id, u.role, u.first_name, u.last_name, u.email,
	su.check_in_time, su.check_out_time
FROM service_days sd
JOIN locations l ON l.id = sd.location_id AND l.organization_id = sd.organization_id
LEFT JOIN shift_segments seg ON seg.service_day_id = sd.id AND seg.organization_id = sd.organization_id
LEFT JOIN segment_users su ON su.segment_id = seg.id AND su.organization_id = seg.organization_id
LEFT JOIN users u ON u.id = su.user_id AND u.organization_id = su.organization_id
`

func round2(v float64) float64 { return math.Round(v*100) / 100 }

// scanServiceDayRows collapses the flat day×segment×user rows into a tree.
func scanServiceDayRows(rows *sql.Rows) ([]*ServiceDay, error) {
	dayMap := make(map[int64]*ServiceDay)
	segIndex := make(map[int64]int) // segment id -> index within its day's Segments
	days := make([]*ServiceDay, 0)

	for rows.Next() {
		var (
			dayID              int64
			title              string
			locationID         int64
			locationName       string
			date               string
			isHoliday          bool
			holidayName        sql.NullString
			status             string
			createdAt          time.Time
			updatedAt          time.Time
			segID              sql.NullInt64
			segName            sql.NullString
			startTime, endTime sql.NullString
			hours              sql.NullFloat64
			userID             sql.NullInt64
			role, firstName    sql.NullString
			lastName, email    sql.NullString
			checkIn, checkOut  sql.NullTime
		)
		if err := rows.Scan(
			&dayID, &title, &locationID, &locationName, &date,
			&isHoliday, &holidayName, &status, &createdAt, &updatedAt,
			&segID, &segName, &startTime, &endTime, &hours,
			&userID, &role, &firstName, &lastName, &email, &checkIn, &checkOut,
		); err != nil {
			return nil, err
		}

		day, ok := dayMap[dayID]
		if !ok {
			day = &ServiceDay{
				ID:           dayID,
				Title:        title,
				LocationID:   locationID,
				LocationName: locationName,
				Date:         date,
				IsHoliday:    isHoliday,
				HolidayName:  holidayName.String,
				Status:       status,
				CreatedAt:    createdAt,
				UpdatedAt:    updatedAt,
				Segments:     make([]Segment, 0),
			}
			dayMap[dayID] = day
			days = append(days, day)
		}

		if !segID.Valid {
			continue
		}
		idx, ok := segIndex[segID.Int64]
		if !ok {
			day.Segments = append(day.Segments, Segment{
				ID:            segID.Int64,
				Name:          segName.String,
				StartTime:     startTime.String,
				EndTime:       endTime.String,
				Hours:         round2(hours.Float64),
				AssignedUsers: make([]AssignedUser, 0),
			})
			idx = len(day.Segments) - 1
			segIndex[segID.Int64] = idx
		}

		if userID.Valid {
			au := AssignedUser{
				ID:        userID.Int64,
				Role:      role.String,
				FirstName: firstName.String,
				LastName:  lastName.String,
				Email:     email.String,
			}
			if checkIn.Valid {
				au.CheckInTime = &checkIn.Time
			}
			if checkOut.Valid {
				au.CheckOutTime = &checkOut.Time
			}
			day.Segments[idx].AssignedUsers = append(day.Segments[idx].AssignedUsers, au)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return days, nil
}

func (s *ServiceDayRepository) query(ctx context.Context, where, orderBy string, args ...any) ([]*ServiceDay, error) {
	rows, err := s.db.QueryContext(ctx, serviceDaySelect+where+orderBy, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanServiceDayRows(rows)
}

func (s *ServiceDayRepository) GetAll(ctx context.Context, organizationID string) ([]*ServiceDay, error) {
	return s.query(ctx,
		`WHERE sd.organization_id = $1`,
		` ORDER BY sd.service_date DESC, sd.id, seg.id, u.id`,
		organizationID)
}

func (s *ServiceDayRepository) GetAllByAssignedUser(ctx context.Context, userID int64, organizationID string) ([]*ServiceDay, error) {
	return s.query(ctx,
		`WHERE sd.organization_id = $2 AND EXISTS (
			SELECT 1 FROM shift_segments seg2
			JOIN segment_users su2 ON su2.segment_id = seg2.id AND su2.organization_id = seg2.organization_id
			WHERE seg2.service_day_id = sd.id AND seg2.organization_id = sd.organization_id AND su2.user_id = $1
		)`,
		` ORDER BY sd.service_date DESC, sd.id, seg.id, u.id`,
		userID, organizationID)
}

func (s *ServiceDayRepository) GetByID(ctx context.Context, id int64, organizationID string) (*ServiceDay, error) {
	days, err := s.query(ctx,
		`WHERE sd.id = $1 AND sd.organization_id = $2`,
		` ORDER BY seg.id, u.id`,
		id, organizationID)
	if err != nil {
		return nil, err
	}
	if len(days) == 0 {
		return nil, ErrNotFound
	}
	return days[0], nil
}

// GetCompletedSince returns completed service days on or after the cutoff date.
func (s *ServiceDayRepository) GetCompletedSince(ctx context.Context, organizationID string, since time.Time) ([]*ServiceDay, error) {
	return s.query(ctx,
		`WHERE sd.organization_id = $1 AND sd.status = 'completed' AND sd.service_date >= $2::date`,
		` ORDER BY sd.service_date DESC, sd.id, seg.id, u.id`,
		organizationID, since.Format("2006-01-02"))
}

// ListForReview returns service days currently awaiting admin confirmation.
func (s *ServiceDayRepository) ListForReview(ctx context.Context, organizationID string) ([]*ServiceDay, error) {
	return s.query(ctx,
		`WHERE sd.organization_id = $1 AND sd.status = 'in_review'`,
		` ORDER BY sd.service_date DESC, sd.id, seg.id, u.id`,
		organizationID)
}

// PromoteEndedToReview moves scheduled days whose segments have all ended into
// the in_review state so an admin can confirm completion.
func (s *ServiceDayRepository) PromoteEndedToReview(ctx context.Context, organizationID string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE service_days sd
		SET status = 'in_review', updated_at = NOW()
		WHERE sd.organization_id = $1
			AND sd.status = 'scheduled'
			AND EXISTS (SELECT 1 FROM shift_segments seg WHERE seg.service_day_id = sd.id AND seg.organization_id = sd.organization_id)
			AND NOT EXISTS (SELECT 1 FROM shift_segments seg WHERE seg.service_day_id = sd.id AND seg.organization_id = sd.organization_id AND seg.end_at > NOW())
	`, organizationID)
	return err
}

func (s *ServiceDayRepository) UpdateStatus(ctx context.Context, id int64, organizationID, status string) error {
	res, err := s.db.ExecContext(ctx,
		`UPDATE service_days SET status = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
		status, id, organizationID)
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

func (s *ServiceDayRepository) Create(ctx context.Context, day *ServiceDay) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, `
		INSERT INTO service_days (organization_id, location_id, title, service_date, is_holiday, holiday_name)
		VALUES ($1, $2, $3, $4::date, $5, NULLIF($6, ''))
		RETURNING id, organization_id, status, created_at, updated_at
	`, day.OrganizationID, day.LocationID, day.Title, day.Date, day.IsHoliday, day.HolidayName).
		Scan(&day.ID, &day.OrganizationID, &day.Status, &day.CreatedAt, &day.UpdatedAt)
	if err != nil {
		return err
	}
	if err := insertSegments(ctx, tx, day); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *ServiceDayRepository) Update(ctx context.Context, day *ServiceDay) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `
		UPDATE service_days
		SET location_id = $1, title = $2, service_date = $3::date, is_holiday = $4,
			holiday_name = NULLIF($5, ''), updated_at = NOW()
		WHERE id = $6 AND organization_id = $7
	`, day.LocationID, day.Title, day.Date, day.IsHoliday, day.HolidayName, day.ID, day.OrganizationID)
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
	// Replace all segments (cascades to segment_users), then re-insert.
	if _, err := tx.ExecContext(ctx,
		`DELETE FROM shift_segments WHERE service_day_id = $1 AND organization_id = $2`,
		day.ID, day.OrganizationID); err != nil {
		return err
	}
	if err := insertSegments(ctx, tx, day); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *ServiceDayRepository) Delete(ctx context.Context, id int64, organizationID string) error {
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM service_days WHERE id = $1 AND organization_id = $2`, id, organizationID)
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

// insertSegments inserts each segment (composing timestamps from the day's
// service_date + segment times, rolling an end past midnight to the next day)
// along with its assigned users. Unknown user ids yield ErrNotFound.
func insertSegments(ctx context.Context, tx *sql.Tx, day *ServiceDay) error {
	for _, seg := range day.Segments {
		var segID int64
		err := tx.QueryRowContext(ctx, `
			INSERT INTO shift_segments (organization_id, service_day_id, name, start_at, end_at)
			VALUES (
				$1, $2, $3,
				($4::date + $5::time) AT TIME ZONE 'UTC',
				CASE
					WHEN $6::time <= $5::time THEN (($4::date + 1) + $6::time) AT TIME ZONE 'UTC'
					ELSE ($4::date + $6::time) AT TIME ZONE 'UTC'
				END
			)
			RETURNING id
		`, day.OrganizationID, day.ID, seg.Name, day.Date, seg.StartTime, seg.EndTime).Scan(&segID)
		if err != nil {
			return err
		}

		seen := make(map[int64]struct{})
		for _, user := range seg.AssignedUsers {
			if user.ID <= 0 {
				continue
			}
			if _, dup := seen[user.ID]; dup {
				continue
			}
			seen[user.ID] = struct{}{}
			res, err := tx.ExecContext(ctx, `
				INSERT INTO segment_users (organization_id, segment_id, user_id)
				SELECT seg.organization_id, seg.id, u.id
				FROM shift_segments seg
				JOIN users u ON u.id = $2 AND u.organization_id = seg.organization_id
				WHERE seg.id = $1 AND seg.organization_id = $3
			`, segID, user.ID, day.OrganizationID)
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
	}
	return nil
}
