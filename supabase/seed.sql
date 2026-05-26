-- Replace this UUID with a real dev user id after signing up locally.
-- Example: select id from auth.users where email = 'dev@example.com';
do $$
declare
  dev_user uuid := (select id from auth.users limit 1);
  m_id uuid := gen_random_uuid();
  mk_a uuid := gen_random_uuid();
  mk_b uuid := gen_random_uuid();
  mk_c uuid := gen_random_uuid();
begin
  if dev_user is null then
    raise notice 'No auth user found, skipping seed.';
    return;
  end if;

  insert into maps (id, user_id, title, description, travel_mode)
  values (m_id, dev_user, 'Sample SF Tour', 'A short walking tour', 'WALKING');

  insert into markers (id, map_id, user_id, label, sequence_order, latitude, longitude, address, color) values
    (mk_a, m_id, dev_user, 'Ferry Building', 0, 37.7955, -122.3937, 'San Francisco, CA', '#4F46E5'),
    (mk_b, m_id, dev_user, 'Union Square', 1, 37.7880, -122.4074, 'San Francisco, CA', '#10B981'),
    (mk_c, m_id, dev_user, 'Chinatown', 2, 37.7941, -122.4078, 'San Francisco, CA', '#F59E0B');

  insert into route_legs (map_id, from_marker_id, to_marker_id, leg_order, distance_meters, duration_seconds) values
    (m_id, mk_a, mk_b, 0, 1300, 900),
    (m_id, mk_b, mk_c, 1, 800, 600);
end $$;
