create table route_legs (
  id uuid default gen_random_uuid() primary key,
  map_id uuid references maps(id) on delete cascade not null,
  from_marker_id uuid references markers(id) on delete cascade not null,
  to_marker_id uuid references markers(id) on delete cascade not null,
  leg_order integer not null,
  distance_meters integer,
  duration_seconds integer,
  polyline_encoded text,
  created_at timestamptz default now()
);
alter table route_legs enable row level security;
create policy "Users manage own route_legs"
  on route_legs for all using (
    exists (
      select 1 from maps
      where maps.id = route_legs.map_id
      and maps.user_id = auth.uid()
    )
  );
create index route_legs_map_id_idx on route_legs(map_id);
