-- StreetFlood Live enterprise spatial foundation.
-- This migration is additive and keeps the existing civic tables intact.

create extension if not exists postgis;
create extension if not exists "uuid-ossp";

do $$ begin
  create type public.enterprise_user_role as enum
    ('resident', 'responder', 'ward_engineer', 'chief_commander');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sync_status as enum ('pending', 'processing', 'synced', 'failed');
exception when duplicate_object then null;
end $$;

create table if not exists public.users_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  full_name text,
  role public.enterprise_user_role not null default 'resident',
  ward_jurisdiction text,
  badge_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flood_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users_profiles(id) on delete set null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  geom geography(Point, 4326),
  depth_category text not null,
  water_depth_cm numeric(6,2) not null check (water_depth_cm >= 0),
  photo_storage_path text,
  status text not null default 'unverified',
  trust_score numeric(4,3) not null default 0 check (trust_score between 0 and 1),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.flood_reports add column if not exists depth_category text;
alter table public.flood_reports add column if not exists water_depth_cm numeric(6,2);
alter table public.flood_reports add column if not exists photo_storage_path text;
alter table public.flood_reports add column if not exists trust_score numeric(4,3) default 0;
alter table public.flood_reports add column if not exists updated_at timestamptz default now();
update public.flood_reports
set
  depth_category = coalesce(depth_category, water_depth::text),
  water_depth_cm = coalesce(water_depth_cm, case water_depth::text
    when 'Footpath' then 5 when 'Ankles' then 10 when 'Knees' then 20 when 'WaistPlus' then 40 else 0 end),
  geom = coalesce(geom, st_setsrid(st_makepoint(lng, lat), 4326)::geography),
  updated_at = coalesce(updated_at, created_at, now())
where geom is null or depth_category is null or water_depth_cm is null;
alter table public.flood_reports alter column depth_category set not null;
alter table public.flood_reports alter column water_depth_cm set not null;
create index if not exists flood_reports_geom_gix on public.flood_reports using gist (geom);
create index if not exists flood_reports_created_idx on public.flood_reports (created_at desc);

create table if not exists public.report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.flood_reports(id) on delete cascade,
  user_id uuid not null references public.users_profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('confirm', 'road_clear')),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create table if not exists public.road_segments (
  id uuid primary key default gen_random_uuid(),
  osm_id bigint unique,
  name text not null,
  highway_type text not null,
  is_major boolean not null default false,
  geom geometry(LineString, 4326) not null,
  ward_code text,
  created_at timestamptz not null default now()
);
create index if not exists road_segments_geom_gix on public.road_segments using gist (geom);

create table if not exists public.road_closures (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.road_segments(id) on delete cascade,
  closure_level text not null check (closure_level in ('small_vehicles', 'all_traffic', 'debris', 'structural')),
  reason text not null,
  officer_in_charge uuid references public.users_profiles(id) on delete set null,
  detour_route_geom geometry(LineString, 4326),
  opened_at timestamptz not null default now(),
  expected_cleared_at timestamptz,
  cleared_at timestamptz
);
create index if not exists road_closures_detour_gix on public.road_closures using gist (detour_route_geom);

create table if not exists public.emergency_shelters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  ward_code text not null,
  geom geography(Point, 4326) not null,
  total_capacity integer not null check (total_capacity >= 0),
  current_headcount integer not null default 0 check (current_headcount >= 0),
  phone_contact text,
  amenities_json jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (current_headcount <= total_capacity)
);
create index if not exists emergency_shelters_geom_gix on public.emergency_shelters using gist (geom);

create table if not exists public.shelter_supplies (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.emergency_shelters(id) on delete cascade,
  item_type text not null,
  quantity numeric(12,2) not null check (quantity >= 0),
  unit text not null,
  last_restocked_at timestamptz not null default now(),
  unique (shelter_id, item_type, unit)
);

create table if not exists public.iot_sensors (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  serial_number text not null unique,
  geom geography(Point, 4326) not null,
  baseline_dry_depth_cm numeric(7,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'maintenance', 'offline', 'retired')),
  installed_at timestamptz,
  last_seen_at timestamptz
);
create index if not exists iot_sensors_geom_gix on public.iot_sensors using gist (geom);

create table if not exists public.sensor_telemetry_logs (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid not null references public.iot_sensors(id) on delete cascade,
  depth_cm numeric(8,2) not null check (depth_cm >= 0),
  rate_of_rise numeric(8,3) not null default 0,
  battery_mv integer,
  signal_rssi integer,
  tamper_alert boolean not null default false,
  recorded_at timestamptz not null default now()
);
create index if not exists sensor_telemetry_sensor_time_idx on public.sensor_telemetry_logs (sensor_id, recorded_at desc);

create table if not exists public.municipal_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_type text not null,
  priority text not null check (priority in ('routine', 'urgent', 'critical')),
  ward_code text not null,
  geom geography(Point, 4326) not null,
  status text not null default 'received',
  lead_agency text,
  resolution_log text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists municipal_incidents_geom_gix on public.municipal_incidents using gist (geom);

create table if not exists public.dispatch_assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.municipal_incidents(id) on delete cascade,
  unit_type text not null,
  unit_identifier text not null,
  dispatched_at timestamptz not null default now(),
  arrived_at timestamptz,
  completed_at timestamptz,
  notes text
);

create table if not exists public.cap_alerts (
  id uuid primary key default gen_random_uuid(),
  cap_identifier text not null unique,
  sender text not null,
  sent_at timestamptz not null default now(),
  status text not null default 'draft',
  msg_type text not null default 'Alert',
  scope text not null default 'Public',
  info_json jsonb not null default '{}'::jsonb
);

create table if not exists public.high_tide_schedules (
  id uuid primary key default gen_random_uuid(),
  tide_timestamp timestamptz not null,
  height_meters numeric(5,2) not null check (height_meters between -2 and 10),
  is_spring_tide boolean not null default false,
  station_name text not null default 'Mumbai Harbour',
  source_url text,
  unique (tide_timestamp, station_name)
);
create index if not exists high_tide_time_idx on public.high_tide_schedules (tide_timestamp);

create table if not exists public.drainage_pumps (
  id uuid primary key default gen_random_uuid(),
  pump_capacity_gpm integer not null check (pump_capacity_gpm > 0),
  ward_code text not null,
  status text not null default 'available' check (status in ('available', 'deployed', 'maintenance', 'offline')),
  fuel_level_pct numeric(5,2) not null default 100 check (fuel_level_pct between 0 and 100),
  geom geography(Point, 4326) not null,
  assigned_incident_id uuid references public.municipal_incidents(id) on delete set null
);
create index if not exists drainage_pumps_geom_gix on public.drainage_pumps using gist (geom);

create table if not exists public.volunteer_responders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profiles(id) on delete cascade,
  specializations text[] not null default '{}',
  active_status boolean not null default false,
  current_assigned_shelter uuid references public.emergency_shelters(id) on delete set null
);

create table if not exists public.evacuation_routes_cache (
  id uuid primary key default gen_random_uuid(),
  origin_geom geography(Point, 4326) not null,
  dest_geom geography(Point, 4326) not null,
  mode text not null check (mode in ('pedestrian', 'twowheeler', 'car', 'heavyRescue')),
  risk_score numeric(6,2) not null,
  waypoints_geojson jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists routes_cache_origin_gix on public.evacuation_routes_cache using gist (origin_geom);
create index if not exists routes_cache_dest_gix on public.evacuation_routes_cache using gist (dest_geom);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users_profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  record_id uuid,
  payload_json jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);
create index if not exists audit_logs_recorded_idx on public.audit_logs (recorded_at desc);

create table if not exists public.offline_sync_journal (
  id uuid primary key default gen_random_uuid(),
  client_uuid text not null,
  entity text not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  payload jsonb not null,
  sync_status public.sync_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);
create index if not exists offline_sync_status_idx on public.offline_sync_journal (sync_status, created_at);

create or replace function public.touch_enterprise_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_profiles_touch on public.users_profiles;
create trigger users_profiles_touch before update on public.users_profiles
for each row execute function public.touch_enterprise_updated_at();
drop trigger if exists flood_reports_touch on public.flood_reports;
create trigger flood_reports_touch before update on public.flood_reports
for each row execute function public.touch_enterprise_updated_at();
drop trigger if exists municipal_incidents_touch on public.municipal_incidents;
create trigger municipal_incidents_touch before update on public.municipal_incidents
for each row execute function public.touch_enterprise_updated_at();

alter table public.users_profiles enable row level security;
alter table public.flood_reports enable row level security;
alter table public.report_confirmations enable row level security;
alter table public.road_segments enable row level security;
alter table public.road_closures enable row level security;
alter table public.emergency_shelters enable row level security;
alter table public.shelter_supplies enable row level security;
alter table public.iot_sensors enable row level security;
alter table public.sensor_telemetry_logs enable row level security;
alter table public.municipal_incidents enable row level security;
alter table public.dispatch_assignments enable row level security;
alter table public.cap_alerts enable row level security;
alter table public.high_tide_schedules enable row level security;
alter table public.drainage_pumps enable row level security;
alter table public.volunteer_responders enable row level security;
alter table public.evacuation_routes_cache enable row level security;
alter table public.audit_logs enable row level security;
alter table public.offline_sync_journal enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'flood_reports','report_confirmations','road_segments','road_closures',
    'emergency_shelters','shelter_supplies','iot_sensors','sensor_telemetry_logs',
    'municipal_incidents','dispatch_assignments','cap_alerts','high_tide_schedules',
    'drainage_pumps','volunteer_responders','evacuation_routes_cache'
  ] loop
    execute format('drop policy if exists "enterprise_public_read" on public.%I', table_name);
    execute format('create policy "enterprise_public_read" on public.%I for select using (true)', table_name);
  end loop;
end $$;

create or replace function public.enterprise_role_at_least(required_role public.enterprise_user_role)
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from public.users_profiles p
    where p.id = auth.uid()
      and case p.role
        when 'chief_commander' then 4
        when 'ward_engineer' then 3
        when 'responder' then 2
        else 1
      end >= case required_role
        when 'chief_commander' then 4
        when 'ward_engineer' then 3
        when 'responder' then 2
        else 1
      end
  );
$$;

comment on schema public is 'StreetFlood Live enterprise spatial and disaster operations foundation';
