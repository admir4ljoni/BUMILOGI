-- +goose Up
create extension if not exists citext;

-- +goose Down
drop extension if exists citext;
