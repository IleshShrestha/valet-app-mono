package repository

import (
	"context"
	"database/sql"
	"errors"
)

// Location is a named geofence plus its billing configuration. Rate fields are
// nullable (a location may not have billing set up yet). Radius is meters.
type Location struct {
	ID                int64    `json:"id"`
	OrganizationID    string   `json:"organization_id,omitempty"`
	Name              string   `json:"name"`
	Latitude          float64  `json:"latitude"`
	Longitude         float64  `json:"longitude"`
	Radius            float64  `json:"radius"`
	BillingType       string   `json:"billing_type"`
	HourlyRate        *float64 `json:"hourly_rate"`
	SingleShiftRate   *float64 `json:"single_shift_rate"`
	DoubleShiftRate   *float64 `json:"double_shift_rate"`
	HolidayMultiplier *float64 `json:"holiday_multiplier"`
	HolidayFlatBonus  *float64 `json:"holiday_flat_bonus"`
	UsesHolidayPay    bool     `json:"uses_holiday_pay"`
}

// LocationSummary is a minimal row for listing pickers.
type LocationSummary struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type LocationRepository struct {
	db *sql.DB
}

const locationColumns = `id, organization_id, name, latitude, longitude, radius,
	billing_type, hourly_rate, single_shift_rate, double_shift_rate,
	holiday_multiplier, holiday_flat_bonus, uses_holiday_pay`

func scanLocation(scan func(dest ...any) error) (*Location, error) {
	var loc Location
	var hourly, single, double, holidayMult, holidayBonus sql.NullFloat64
	if err := scan(
		&loc.ID, &loc.OrganizationID, &loc.Name, &loc.Latitude, &loc.Longitude, &loc.Radius,
		&loc.BillingType, &hourly, &single, &double, &holidayMult, &holidayBonus, &loc.UsesHolidayPay,
	); err != nil {
		return nil, err
	}
	loc.HourlyRate = nullFloatPtr(hourly)
	loc.SingleShiftRate = nullFloatPtr(single)
	loc.DoubleShiftRate = nullFloatPtr(double)
	loc.HolidayMultiplier = nullFloatPtr(holidayMult)
	loc.HolidayFlatBonus = nullFloatPtr(holidayBonus)
	return &loc, nil
}

func nullFloatPtr(v sql.NullFloat64) *float64 {
	if !v.Valid {
		return nil
	}
	f := v.Float64
	return &f
}

func (l *LocationRepository) GetByID(ctx context.Context, id int64, organizationID string) (*Location, error) {
	query := `SELECT ` + locationColumns + `
		FROM locations
		WHERE id = $1 AND organization_id = $2`
	loc, err := scanLocation(l.db.QueryRowContext(ctx, query, id, organizationID).Scan)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return loc, nil
}

func (l *LocationRepository) GetAll(ctx context.Context, organizationID string) ([]*Location, error) {
	query := `SELECT ` + locationColumns + `
		FROM locations
		WHERE organization_id = $1
		ORDER BY name`
	rows, err := l.db.QueryContext(ctx, query, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*Location, 0)
	for rows.Next() {
		loc, err := scanLocation(rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, loc)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (l *LocationRepository) ListSummaries(ctx context.Context, organizationID string) ([]LocationSummary, error) {
	query := `
	SELECT id, name
	FROM locations
	WHERE organization_id = $1
	ORDER BY name
	`
	rows, err := l.db.QueryContext(ctx, query, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]LocationSummary, 0)
	for rows.Next() {
		var s LocationSummary
		if err := rows.Scan(&s.ID, &s.Name); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (l *LocationRepository) Create(ctx context.Context, loc *Location) error {
	if loc.BillingType == "" {
		loc.BillingType = "hourly_per_person"
	}
	query := `
	INSERT INTO locations (organization_id, name, latitude, longitude, radius,
		billing_type, hourly_rate, single_shift_rate, double_shift_rate,
		holiday_multiplier, holiday_flat_bonus, uses_holiday_pay)
	VALUES (COALESCE(NULLIF($1, '')::uuid, '00000000-0000-0000-0000-000000000001'),
		$2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	RETURNING id, organization_id
	`
	return l.db.QueryRowContext(ctx, query,
		loc.OrganizationID, loc.Name, loc.Latitude, loc.Longitude, loc.Radius,
		loc.BillingType, loc.HourlyRate, loc.SingleShiftRate, loc.DoubleShiftRate,
		loc.HolidayMultiplier, loc.HolidayFlatBonus, loc.UsesHolidayPay,
	).Scan(&loc.ID, &loc.OrganizationID)
}

// UpdateBilling updates the billing configuration for a location.
func (l *LocationRepository) UpdateBilling(ctx context.Context, loc *Location) error {
	if loc.BillingType == "" {
		loc.BillingType = "hourly_per_person"
	}
	query := `
	UPDATE locations
	SET billing_type = $1,
		hourly_rate = $2,
		single_shift_rate = $3,
		double_shift_rate = $4,
		holiday_multiplier = $5,
		holiday_flat_bonus = $6,
		uses_holiday_pay = $7
	WHERE id = $8 AND organization_id = $9
	`
	res, err := l.db.ExecContext(ctx, query,
		loc.BillingType, loc.HourlyRate, loc.SingleShiftRate, loc.DoubleShiftRate,
		loc.HolidayMultiplier, loc.HolidayFlatBonus, loc.UsesHolidayPay,
		loc.ID, loc.OrganizationID,
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
