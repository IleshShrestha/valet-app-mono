-- +goose Up
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius INTEGER NOT NULL
);

COMMENT ON COLUMN locations.radius IS 'Geofence radius in meters';

ALTER TABLE shifts 
ADD COLUMN location_id BIGINT REFERENCES locations(id);

INSERT INTO locations (name, latitude, longitude, radius)
SELECT DISTINCT s.location, 0, 0, 100
FROM shifts s
WHERE s.location IS NOT NULL 
  AND TRIM(s.location) <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE shifts s 
SET location_id = l.id 
FROM locations l 
WHERE l.name = s.location;

ALTER TABLE shifts 
DROP COLUMN location;

ALTER TABLE shifts 
ALTER COLUMN location_id SET NOT NULL;

CREATE INDEX idx_shifts_location_id ON shifts(location_id);


-- +goose Down
ALTER TABLE shifts 
ADD COLUMN location VARCHAR(255);

UPDATE shifts s 
SET location = l.name 
FROM locations l 
WHERE s.location_id = l.id;

ALTER TABLE shifts 
ALTER COLUMN location SET NOT NULL;

DROP INDEX IF EXISTS idx_shifts_location_id;

ALTER TABLE shifts 
DROP COLUMN location_id;

DROP TABLE locations;