-- +goose Up
-- File name under uploads/private/; the API only ever builds the path from this.
alter table preorders add column payment_proof_path text
    check (payment_proof_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$');

-- +goose Down
alter table preorders drop column payment_proof_path;
