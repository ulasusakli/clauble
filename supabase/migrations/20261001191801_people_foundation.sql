create type public.person_status as enum (
  'active',
  'suspended',
  'deactivated',
  'deleted'
);

create table public.people (
  id uuid primary key,
  username text not null,
  display_name text not null,
  headline text,
  bio text,
  avatar_path text,
  website_url text,
  status public.person_status not null default 'active',
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_id_fkey
    foreign key (id)
    references auth.users (id)
    on delete restrict,
  constraint people_username_key unique (username),
  constraint people_username_format_check
    check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint people_display_name_length_check
    check (char_length(display_name) between 1 and 80),
  constraint people_headline_length_check
    check (headline is null or char_length(headline) <= 120),
  constraint people_bio_length_check
    check (bio is null or char_length(bio) <= 500),
  constraint people_avatar_path_length_check
    check (avatar_path is null or char_length(avatar_path) <= 1024),
  constraint people_website_url_length_check
    check (website_url is null or char_length(website_url) <= 2048)
);

create index people_status_idx on public.people (status);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

create trigger people_set_updated_at
before update on public.people
for each row
execute function public.set_updated_at();

alter table public.people enable row level security;

revoke all on table public.people from anon, authenticated, service_role;
revoke all on type public.person_status from public, anon, authenticated, service_role;

grant usage on type public.person_status to anon, authenticated, service_role;

grant select on table public.people to anon, authenticated;

grant insert (
  id,
  username,
  display_name,
  headline,
  bio,
  avatar_path,
  website_url,
  profile_completed_at
) on public.people to authenticated;

grant update (
  username,
  display_name,
  headline,
  bio,
  avatar_path,
  website_url,
  profile_completed_at
) on public.people to authenticated;

grant select, insert, update, delete on table public.people to service_role;

create policy people_select_active
on public.people
for select
to anon, authenticated
using (status = 'active');

create policy people_select_own
on public.people
for select
to authenticated
using ((select auth.uid()) = id);

create policy people_insert_own
on public.people
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy people_update_own
on public.people
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
