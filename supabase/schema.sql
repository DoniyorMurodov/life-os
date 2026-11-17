-- Life OS — cloud sync schema.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.lifeos_records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null,
  id         text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

create index if not exists lifeos_records_user_updated_idx
  on public.lifeos_records (user_id, updated_at);

-- The server decides the timestamp (devices' clocks can be wrong).
create or replace function public.lifeos_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists lifeos_records_touch on public.lifeos_records;
create trigger lifeos_records_touch
  before insert or update on public.lifeos_records
  for each row execute function public.lifeos_touch_updated_at();

-- Row level security: every user can only see and change their own rows.
alter table public.lifeos_records enable row level security;

drop policy if exists "lifeos select own" on public.lifeos_records;
drop policy if exists "lifeos insert own" on public.lifeos_records;
drop policy if exists "lifeos update own" on public.lifeos_records;
drop policy if exists "lifeos delete own" on public.lifeos_records;

create policy "lifeos select own" on public.lifeos_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "lifeos insert own" on public.lifeos_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lifeos update own" on public.lifeos_records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "lifeos delete own" on public.lifeos_records
  for delete to authenticated using ((select auth.uid()) = user_id);
