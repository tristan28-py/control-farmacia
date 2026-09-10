-- Fase 2. Ejecutar una vez como administrador en el proyecto Supabase correcto.
-- Si profiles ya existe, detenerse y revisar su estructura antes de aplicar.
begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text constraint profiles_full_name_length check (char_length(full_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Sin acceso anónimo, INSERT ni DELETE desde el cliente.
-- Solo full_name es editable; el cliente no puede cambiar id ni las fechas.
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

-- El trigger necesita insertar aunque Auth no tenga permisos sobre profiles.
-- search_path vacío y nombres calificados evitan resolver objetos de otro esquema.
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    case
      when jsonb_typeof(new.raw_user_meta_data -> 'full_name') = 'string'
      then nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 100), '')
      else null
    end
  );
  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- También cubrir las cuentas registradas durante la fase 1.
insert into public.profiles (id, full_name)
select
  id,
  case
    when jsonb_typeof(raw_user_meta_data -> 'full_name') = 'string'
    then nullif(left(btrim(raw_user_meta_data ->> 'full_name'), 100), '')
    else null
  end
from auth.users
on conflict (id) do nothing;

commit;
