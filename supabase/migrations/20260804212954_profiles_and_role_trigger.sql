-- Profiles table storing a role per authenticated user.
-- Referenced by the app in src/app/(app)/** and src/components/AppHeader.tsx.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'manager'
    check (role in ('owner', 'manager', 'tenant', 'maintenance', 'accounting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Grant table privileges to the API roles. RLS policies below still gate which
-- rows each user can actually read or modify.
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;

-- Each user can read and update only their own profile row.
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up, copying the
-- full_name and role provided in the signup metadata (see AuthForm.tsx).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'manager')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
