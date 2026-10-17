-- +goose Up
create type edition as enum ('samudra', 'rimba');

create table products (
    id          uuid primary key default gen_random_uuid(),
    slug        text unique not null,  -- shareable /produk/<slug> links
    edition     edition not null,
    name        text not null,
    tagline     text not null default '',
    description text not null default '',
    contents    text[] not null default '{}',
    animals     text[] not null default '{}',
    price_idr   integer not null check (price_idr > 0),
    image_url   text,
    is_active   bool not null default true,
    updated_at  timestamptz not null default now()
);

insert into products (slug, edition, name, tagline, description, contents, animals, price_idr) values
('set-rimba', 'rimba', 'Set Rimba', 'Hutan hujan tropis',
 'Pandu badak jawa dan orangutan menyusuri hutan hujan, satu perintah demi satu perintah. Anak menyusun keping perintah, lalu menjalankan tokoh satwa di papan untuk mencapai bintang.',
 array['Papan koding 6×6', '24 keping perintah (maju, belok, ulangi)', '3 tokoh satwa Rimba', '12 kartu misi bertingkat', 'Panduan bermain untuk guru & orang tua'],
 array['Badak Jawa', 'Orangutan', 'Pohon hutan hujan'], 250000),
('set-samudra', 'samudra', 'Set Samudra', 'Terumbu karang',
 'Arahkan ikan badut menjelajahi terumbu karang tanpa menabrak karang. Setiap misi melatih anak memecah masalah menjadi langkah-langkah kecil yang runtut.',
 array['Papan koding 6×6', '24 keping perintah (maju, belok, ulangi)', '3 tokoh satwa Samudra', '12 kartu misi bertingkat', 'Panduan bermain untuk guru & orang tua'],
 array['Ikan badut', 'Terumbu karang'], 250000);

-- +goose Down
drop table products;
drop type edition;
