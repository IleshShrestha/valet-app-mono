package repository

import (
	"context"
	"database/sql"
	"errors"
)

// Location is a named geofence. Radius is the geofence radius in meters.
type Location struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Radius    float64 `json:"radius"`
}

// LocationSummary is a minimal row for listing pickers (e.g. GET /shifts/locations).
type LocationSummary struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type LocationRepository struct {
	db *sql.DB
}

func (l *LocationRepository) GetByID(ctx context.Context, id int64) (*Location, error) {
	query := `
	SELECT id, name, latitude, longitude, radius
	FROM locations
	WHERE id = $1
	`
	var loc Location
	err := l.db.QueryRowContext(ctx, query, id).Scan(
		&loc.ID,
		&loc.Name,
		&loc.Latitude,
		&loc.Longitude,
		&loc.Radius,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &loc, nil
}

func (l *LocationRepository) ListSummaries(ctx context.Context) ([]LocationSummary, error) {
	query := `
	SELECT id, name
	FROM locations
	ORDER BY name
	`
	rows, err := l.db.QueryContext(ctx, query)
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
	query := `
	INSERT INTO locations (name, latitude, longitude, radius)
	VALUES ($1, $2, $3, $4)
	RETURNING id
	`
	err := l.db.QueryRowContext(ctx, query, loc.Name, loc.Latitude, loc.Longitude, loc.Radius).Scan(&loc.ID)
	if err != nil {
		return err
	}
	return nil
}
