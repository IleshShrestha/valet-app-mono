-- +goose Up
CREATE TABLE IF NOT EXISTS shift_users (
    shift_id bigserial NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    user_id bigserial NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (shift_id, user_id)
);
-- +goose Down
DROP TABLE IF EXISTS shift_users;
