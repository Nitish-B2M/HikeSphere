create table saved_places (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  label text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  place_id text,
  category text default 'favorite'
    check (category in ('home','work','favorite','other')),
  created_at timestamptz default now()
);
alter table saved_places enable row level security;
create policy "Users manage own saved_places"
  on saved_places for all using (auth.uid() = user_id);
