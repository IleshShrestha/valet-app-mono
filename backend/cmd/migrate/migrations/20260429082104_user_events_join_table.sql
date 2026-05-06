-- +goose Up

-- Fix foreign key column types if they were created as bigserial.
-- This keeps the underlying type as BIGINT, but removes the auto-generated default sequences.
ALTER TABLE shift_users
    ALTER COLUMN shift_id DROP DEFAULT,
    ALTER COLUMN user_id DROP DEFAULT;

-- Add useful assignment tracking columns
ALTER TABLE shift_users
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ,

-- Optional but recommended indexes
CREATE INDEX IF NOT EXISTS idx_shift_users_shift_id
    ON shift_users (shift_id);

CREATE INDEX IF NOT EXISTS idx_shift_users_user_id
    ON shift_users (user_id);



-- +goose Down

DROP INDEX IF EXISTS idx_shift_users_user_id;
DROP INDEX IF EXISTS idx_shift_users_shift_id;

ALTER TABLE shift_users
    DROP COLUMN IF EXISTS check_out_time,
    DROP COLUMN IF EXISTS check_in_time,
    DROP COLUMN IF EXISTS confirmed_at,