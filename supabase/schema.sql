create extension if not exists postgis;

create table issues (
  id            uuid primary key default gen_random_uuid(),
  category      text not null check (category in
                  ('garbage','pothole','drain_blockage','waterlogging','other')),
  severity      int  not null check (severity between 1 and 5),
  description   text,
  lat           double precision not null,
  lng           double precision not null,
  geom          geography(point, 4326) not null,
  ward          text,
  status        text not null default 'reported'
                  check (status in ('reported','assigned','resolved')),
  report_count  int  not null default 1,
  before_photo  text,
  after_photo   text,
  verification  jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index issues_geom_idx   on issues using gist (geom);
create index issues_status_idx on issues (status, created_at desc);

create table reports (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references issues(id) on delete cascade,
  photo_url   text,
  lat         double precision not null,
  lng         double precision not null,
  severity    int  not null,
  created_at  timestamptz not null default now()
);
create index reports_issue_idx on reports (issue_id);

-- Only the server (service role) touches these tables: RLS on, no policies.
alter table issues  enable row level security;
alter table reports enable row level security;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Dedupe + insert in one transaction
create or replace function report_issue(
  p_category    text,
  p_severity    int,
  p_description text,
  p_lat         double precision,
  p_lng         double precision,
  p_ward        text,
  p_photo       text,
  p_radius_m    double precision default 30,
  p_created_at  timestamptz default now()
) returns table (o_issue_id uuid, o_merged boolean, o_count int)
language plpgsql as $$
declare
  v_pt  geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_id  uuid;
  v_cnt int;
begin
  -- serialise per category so two simultaneous reports cannot both create an issue
  perform pg_advisory_xact_lock(hashtext(p_category));
  select i.id into v_id
    from issues i
   where i.category = p_category
     and i.status <> 'resolved'
     and st_dwithin(i.geom, v_pt, p_radius_m)
   order by st_distance(i.geom, v_pt)
   limit 1;
  if v_id is not null then
    update issues
       set report_count = report_count + 1,
           severity     = greatest(severity, p_severity),
           updated_at   = now()
     where id = v_id
    returning report_count into v_cnt;
    insert into reports (issue_id, photo_url, lat, lng, severity, created_at)
    values (v_id, p_photo, p_lat, p_lng, p_severity, p_created_at);
    return query select v_id, true, v_cnt;
  else
    insert into issues (category, severity, description, lat, lng, geom, ward,
                        before_photo, created_at, updated_at)
    values (p_category, p_severity, p_description, p_lat, p_lng, v_pt, p_ward,
            p_photo, p_created_at, p_created_at)
    returning id into v_id;
    insert into reports (issue_id, photo_url, lat, lng, severity, created_at)
    values (v_id, p_photo, p_lat, p_lng, p_severity, p_created_at);
    return query select v_id, false, 1;
  end if;
end $$;
