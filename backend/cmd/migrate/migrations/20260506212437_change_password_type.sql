-- +goose Up
ALTER TABLE users
    ALTER COLUMN password TYPE TEXT
    USING '';

-- Temporary default password: ChangeMe123!
-- This is a bcrypt hash, not the raw password.
-- Force users to change this after first login if this is anything beyond local/dev testing.
UPDATE users
SET password = '$2y$12$eTIdQzA7U6rDJwv7R8arY.8hyEI.bnMKXteJOkliW/w0wx3DjMLqW';

-- Optional: make sure the column is required.
ALTER TABLE users
    ALTER COLUMN password SET NOT NULL;


-- +goose Down
-- Convert password back to BYTEA if rolling back.
ALTER TABLE users
    ALTER COLUMN password TYPE BYTEA
    USING convert_to(password, 'UTF8');