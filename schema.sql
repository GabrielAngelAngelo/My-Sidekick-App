-- Run this once in the Supabase SQL editor.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists invites (
  code text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  inviter uuid not null references profiles(id) on delete cascade,
  role text not null default 'Best friend',
  used_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- One row per pair. a is always the smaller id so a pair cannot appear twice.
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references profiles(id) on delete cascade,
  b uuid not null references profiles(id) on delete cascade,
  role text not null default 'Best friend',
  created_at timestamptz not null default now(),
  unique (a, b),
  check (a < b)
);

alter table profiles enable row level security;
alter table invites enable row level security;
alter table friendships enable row level security;

-- Profiles: you see yourself and your friends.
create policy "read own and friends profiles" on profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1 from friendships f
    where (f.a = auth.uid() and f.b = profiles.id)
       or (f.b = auth.uid() and f.a = profiles.id)
  )
);
create policy "insert own profile" on profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on profiles for update to authenticated using (id = auth.uid());

-- Invites: only the person who made one can see or create it.
create policy "read own invites" on invites for select to authenticated using (inviter = auth.uid());
create policy "create own invites" on invites for insert to authenticated with check (inviter = auth.uid());

-- Friendships: you see yours. Rows are only created by accept_invite below.
create policy "read own friendships" on friendships for select to authenticated
using (a = auth.uid() or b = auth.uid());
create policy "leave a friendship" on friendships for delete to authenticated
using (a = auth.uid() or b = auth.uid());

create or replace function accept_invite(invite_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invites;
  inviter_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;

  select * into inv from invites where code = invite_code and used_by is null;
  if not found then
    raise exception 'This invite is not valid or was already used';
  end if;
  if inv.inviter = auth.uid() then
    raise exception 'You cannot accept your own invite';
  end if;

  insert into friendships (a, b, role)
  values (least(inv.inviter, auth.uid()), greatest(inv.inviter, auth.uid()), inv.role)
  on conflict do nothing;

  update invites set used_by = auth.uid() where code = invite_code;

  select name into inviter_name from profiles where id = inv.inviter;
  return inviter_name;
end;
$$;

revoke all on function accept_invite(text) from public;
grant execute on function accept_invite(text) to authenticated;
