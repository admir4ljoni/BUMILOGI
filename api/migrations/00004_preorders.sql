-- +goose Up
create type order_status as enum ('pending_payment', 'confirmed', 'shipped', 'cancelled');

create table preorders (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null references users,
    order_code     text unique not null,             -- BUMI-YYYY-XXXXX
    product_id     uuid not null references products,
    unit_price_idr integer not null check (unit_price_idr > 0), -- snapshot at order time
    quantity       integer not null check (quantity between 1 and 100),
    unique_code    smallint not null check (unique_code between 1 and 999),
    total_idr      integer not null,
    recipient_name text not null,
    phone          text not null,
    address_text   text not null,                    -- source of truth; the map pin is optional help
    lat            double precision,
    lng            double precision,
    place_id       text,
    status         order_status not null default 'pending_payment',
    admin_note     text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    check (total_idr = unit_price_idr * quantity + unique_code),
    check ((lat is null) = (lng is null))
);
create index on preorders (user_id, created_at desc);
create index on preorders (status, created_at desc);
-- No two open orders share a transfer amount, so the bank statement identifies the order.
create unique index preorders_open_total on preorders (total_idr) where status = 'pending_payment';

-- Manager-editable content. Task 7 uses section 'payment':
-- {bank_name, account_number, account_holder, whatsapp}. Task 13 adds the landing sections.
create table cms_contents (
    section_key text primary key,
    title       text,
    body        jsonb not null,
    updated_by  uuid references users on delete set null,
    updated_at  timestamptz not null default now()
);

-- +goose Down
drop table cms_contents;
drop table preorders;
drop type order_status;
