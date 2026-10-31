-- StreetFlood Live — Supabase Database Migration & Schema
-- Free Tier Compatible (500MB DB, RLS security policies, no paid servers needed)

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUM TYPES
create type user_role as enum ('citizen', 'moderator', 'authority', 'admin');
create type water_depth as enum ('Footpath', 'Ankles', 'Knees', 'WaistPlus');
create type report_status as enum ('Unverified', 'Verified', 'Dismissed');
create type incident_status as enum ('PartiallyFlooded', 'ClosedSmallVehicles', 'ClosedAllTraffic');
create type alert_severity as enum ('Info', 'Warning', 'Critical');
create type alert_status as enum ('Draft', 'Published', 'Archived');
create type vote_type as enum ('confirm', 'cleared');

-- 3. USER PROFILES & ROLES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role user_role default 'citizen' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone" 
  on public.profiles for select using (true);

create policy "Users can update own profile" 
  on public.profiles for update using (auth.uid() = id);

-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'citizen'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security helper to check roles
create or replace function public.has_role(required_role user_role)
returns boolean as $$
declare
  user_role_val user_role;
begin
  if auth.uid() is null then
    return false;
  end if;
  select role into user_role_val from public.profiles where id = auth.uid();
  if user_role_val = 'admin' then
    return true; -- admin has all permissions
  end if;
  return user_role_val = required_role;
end;
$$ language plpgsql security definer;

-- 4. FLOOD REPORTS TABLE
create table if not exists public.flood_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  lat double precision not null,
  lng double precision not null,
  address_text text,
  water_depth water_depth not null,
  description text default '',
  photo_url text,
  status report_status default 'Unverified' not null,
  confirm_votes integer default 0 not null,
  cleared_votes integer default 0 not null,
  created_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '6 hours') not null,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

-- Spatial/coordinate and expiry indices
create index if not exists idx_reports_lat_lng on public.flood_reports(lat, lng);
create index if not exists idx_reports_expires_at on public.flood_reports(expires_at);
create index if not exists idx_reports_created_at on public.flood_reports(created_at desc);

alter table public.flood_reports enable row level security;

create policy "Reports are viewable by all"
  on public.flood_reports for select using (true);

create policy "Authenticated users can submit reports"
  on public.flood_reports for insert with check (auth.role() = 'authenticated');

create policy "Authorities & moderators can update report status"
  on public.flood_reports for update using (
    public.has_role('authority') or public.has_role('moderator') or public.has_role('admin')
  );

-- 5. REPORT VOTES TABLE (Consensus & Verification)
create table if not exists public.report_votes (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.flood_reports(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  vote vote_type not null,
  created_at timestamptz default now() not null,
  constraint unique_user_report_vote unique (report_id, user_id)
);

alter table public.report_votes enable row level security;

create policy "Votes are viewable by all"
  on public.report_votes for select using (true);

create policy "Authenticated users can cast one vote per report"
  on public.report_votes for insert with check (auth.uid() = user_id);

create policy "Users can change their vote"
  on public.report_votes for update using (auth.uid() = user_id);

-- Trigger to keep report vote totals in sync
create or replace function public.sync_report_votes()
returns trigger as $$
declare
  target_id uuid;
  c_count integer;
  d_count integer;
begin
  target_id := coalesce(new.report_id, old.report_id);
  select 
    count(*) filter (where vote = 'confirm'),
    count(*) filter (where vote = 'cleared')
  into c_count, d_count
  from public.report_votes
  where report_id = target_id;

  update public.flood_reports
  set 
    confirm_votes = c_count,
    cleared_votes = d_count,
    -- Auto-verify when 3 or more citizens confirm
    status = case 
      when c_count >= 3 and status = 'Unverified' then 'Verified'::report_status
      else status 
    end
  where id = target_id;

  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_vote_change on public.report_votes;
create trigger on_vote_change
  after insert or update or delete on public.report_votes
  for each row execute function public.sync_report_votes();

-- 6. ROAD INCIDENTS (Authority Closures)
create table if not exists public.road_incidents (
  id uuid default gen_random_uuid() primary key,
  road_name text not null,
  status incident_status not null,
  description text default '',
  lat double precision not null,
  lng double precision not null,
  geometry jsonb default '[]'::jsonb, -- [[lat, lng], ...]
  is_active boolean default true not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_incidents_coords on public.road_incidents(lat, lng);
create index if not exists idx_incidents_active on public.road_incidents(is_active);

alter table public.road_incidents enable row level security;

create policy "Incidents are viewable by all"
  on public.road_incidents for select using (true);

create policy "Authorities can manage road incidents"
  on public.road_incidents for all using (
    public.has_role('authority') or public.has_role('admin')
  );

-- 7. FLOOD ALERTS TABLE
create table if not exists public.flood_alerts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  severity alert_severity not null,
  status alert_status default 'Published' not null,
  polygon_coords jsonb default '[]'::jsonb,
  area_label text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  published_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '24 hours') not null
);

create index if not exists idx_alerts_status on public.flood_alerts(status);

alter table public.flood_alerts enable row level security;

create policy "Published alerts viewable by all"
  on public.flood_alerts for select using (status = 'Published');

create policy "Authorities can manage alerts"
  on public.flood_alerts for all using (
    public.has_role('authority') or public.has_role('admin')
  );

-- 8. OFFICIAL SHELTERS TABLE
create table if not exists public.official_shelters (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  kind text default 'Community Hall' not null,
  capacity_status text default 'Space available' not null,
  contact_phone text,
  accessibility_note text,
  is_verified boolean default true not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_shelters_coords on public.official_shelters(lat, lng);

alter table public.official_shelters enable row level security;

create policy "Shelters viewable by all"
  on public.official_shelters for select using (true);

create policy "Authorities can manage shelters"
  on public.official_shelters for all using (
    public.has_role('authority') or public.has_role('admin')
  );

-- 9. KEEPALIVE RPC FUNCTION (For GitHub Action daily ping)
create or replace function public.keepalive_ping()
returns jsonb as $$
begin
  return jsonb_build_object(
    'status', 'ok',
    'timestamp', now(),
    'message', 'StreetFlood database is active'
  );
end;
$$ language plpgsql security definer;

-- 10. REALTIME PUBLICATION
-- Enable realtime on tables so browser clients receive live updates
alter publication supabase_realtime add table public.flood_reports;
alter publication supabase_realtime add table public.road_incidents;
alter publication supabase_realtime add table public.flood_alerts;
alter publication supabase_realtime add table public.official_shelters;
