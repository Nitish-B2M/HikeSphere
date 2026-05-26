create table markers (
  id uuid default gen_random_uuid() primary key,
  map_id uuid references maps(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  label text not null,
  sequence_order integer not null,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  place_id text,
  color text default '#4F46E5',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table markers enable row level security;
create policy "Users manage own markers"
  on markers for all using (auth.uid() = user_id);
create index markers_map_id_idx on markers(map_id);
create index markers_sequence_idx on markers(map_id, sequence_order);
create trigger markers_updated_at before update on markers
  for each row execute function update_updated_at();
