-- +goose Up
create type user_role as enum ('customer', 'manager');

create table users (
    id                uuid primary key default gen_random_uuid(),
    google_sub        text unique,          -- null = email-only
    email             citext unique not null,
    email_verified_at timestamptz,
    password_hash     text,                 -- null = Google-only
    token_version     int not null default 0, -- bump to kill refresh tokens
    full_name         text not null,
    avatar_url        text,
    phone             text,
    role              user_role not null default 'customer',
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    check (google_sub is not null or password_hash is not null)
);

-- Verify/reset links. Only the SHA-256 of the token is stored; single-use via used_at.
create table email_tokens (
    token_hash bytea primary key,
    user_id    uuid not null references users on delete cascade,
    purpose    text not null check (purpose in ('verify', 'reset')),
    expires_at timestamptz not null,
    used_at    timestamptz
);

-- +goose Down
drop table email_tokens;
drop table users;
drop type user_role;
