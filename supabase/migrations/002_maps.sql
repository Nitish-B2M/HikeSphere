create table maps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null default 'My Map',
  description text,
  travel_mode text default 'DRIVING'
    check (travel_mode in ('DRIVING','MOTORBIKE','WALKING','BICYCLING')),
  category text default 'other'
    check (category in ('trip','trekking','sightseeing','commute','delivery','other')),
  total_distance_meters integer,
  total_duration_seconds integer,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table maps enable row level security;
create policy "Users manage own maps"
  on maps for all using (auth.uid() = user_id);
create policy "Public maps are viewable"
  on maps for select using (is_public = true);

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger maps_updated_at before update on maps
  for each row execute function update_updated_at();
