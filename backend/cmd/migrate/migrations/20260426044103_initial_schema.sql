-- +goose Up
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO organizations (id, name, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'active')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES organizations(id) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'employee', 'admin')),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, id)
);

CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    radius INTEGER NOT NULL CHECK (radius > 0),
    UNIQUE (organization_id, id),
    UNIQUE (organization_id, name)
);

COMMENT ON COLUMN locations.radius IS 'Geofence radius in meters';

CREATE TABLE IF NOT EXISTS shifts (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES organizations(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    location_id BIGINT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_at > start_at),
    UNIQUE (organization_id, id),
    FOREIGN KEY (organization_id, location_id) REFERENCES locations(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS shift_users (
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES organizations(id) ON DELETE RESTRICT,
    shift_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    PRIMARY KEY (shift_id, user_id),
    FOREIGN KEY (organization_id, shift_id) REFERENCES shifts(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, user_id) REFERENCES users(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    platform VARCHAR(50),
    device_name VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id, user_id) REFERENCES users(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN (
            'login_success',
            'login_failed',
            'refresh_success',
            'logout',
            'token_revoked'
        )
    ),
    platform VARCHAR(50),
    device_name VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_organization_id
    ON users(organization_id);

CREATE INDEX IF NOT EXISTS idx_locations_organization_id
    ON locations(organization_id);

CREATE INDEX IF NOT EXISTS idx_shifts_organization_id
    ON shifts(organization_id);

CREATE INDEX IF NOT EXISTS idx_shifts_location_id
    ON shifts(location_id);

CREATE INDEX IF NOT EXISTS idx_shift_users_organization_id
    ON shift_users(organization_id);

CREATE INDEX IF NOT EXISTS idx_shift_users_shift_id
    ON shift_users(shift_id);

CREATE INDEX IF NOT EXISTS idx_shift_users_user_id
    ON shift_users(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_organization_id
    ON refresh_tokens(organization_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
    ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_events_organization_id
    ON auth_events(organization_id);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id
    ON auth_events(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_events_created_at
    ON auth_events(created_at);

-- +goose Down
DROP TABLE IF EXISTS auth_events;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS shift_users;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
