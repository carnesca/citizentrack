create extension if not exists pgcrypto;

create table if not exists public.application_predictions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.citizenship_applications(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  predicted_next_milestone text not null,
  date_range_start date,
  date_range_end date,
  confidence text not null,
  similar_cases_count integer not null default 0,
  basis text not null,
  caveats text not null,
  statistical_snapshot jsonb not null default '{}'::jsonb,
  ai_model text not null default 'deterministic-fallback',
  created_at timestamptz not null default now()
);

alter table public.application_predictions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists application_id uuid,
  add column if not exists owner_id uuid,
  add column if not exists predicted_next_milestone text,
  add column if not exists date_range_start date,
  add column if not exists date_range_end date,
  add column if not exists confidence text,
  add column if not exists similar_cases_count integer default 0,
  add column if not exists basis text,
  add column if not exists caveats text,
  add column if not exists statistical_snapshot jsonb default '{}'::jsonb,
  add column if not exists ai_model text default 'deterministic-fallback',
  add column if not exists created_at timestamptz default now();

alter table public.application_predictions
  alter column id set default gen_random_uuid(),
  alter column similar_cases_count set default 0,
  alter column statistical_snapshot set default '{}'::jsonb,
  alter column ai_model set default 'deterministic-fallback',
  alter column created_at set default now();

update public.application_predictions
set
  similar_cases_count = coalesce(similar_cases_count, 0),
  statistical_snapshot = coalesce(statistical_snapshot, '{}'::jsonb),
  ai_model = coalesce(ai_model, 'deterministic-fallback'),
  created_at = coalesce(created_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'application_predictions_pkey'
      and conrelid = 'public.application_predictions'::regclass
  ) then
    alter table public.application_predictions
      add constraint application_predictions_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'application_predictions_application_id_fkey'
      and conrelid = 'public.application_predictions'::regclass
  ) then
    alter table public.application_predictions
      add constraint application_predictions_application_id_fkey
      foreign key (application_id)
      references public.citizenship_applications(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'application_predictions_owner_id_fkey'
      and conrelid = 'public.application_predictions'::regclass
  ) then
    alter table public.application_predictions
      add constraint application_predictions_owner_id_fkey
      foreign key (owner_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'application_predictions_confidence_check'
      and conrelid = 'public.application_predictions'::regclass
  ) then
    alter table public.application_predictions
      add constraint application_predictions_confidence_check
      check (confidence in ('low', 'medium', 'high'));
  end if;
end;
$$;

alter table public.application_predictions
  alter column id set not null,
  alter column application_id set not null,
  alter column owner_id set not null,
  alter column predicted_next_milestone set not null,
  alter column confidence set not null,
  alter column similar_cases_count set not null,
  alter column basis set not null,
  alter column caveats set not null,
  alter column statistical_snapshot set not null,
  alter column ai_model set not null,
  alter column created_at set not null;

create index if not exists application_predictions_owner_application_created_idx
  on public.application_predictions(owner_id, application_id, created_at desc);

create index if not exists application_predictions_application_owner_idx
  on public.application_predictions(application_id, owner_id);

alter table public.application_predictions enable row level security;

grant select, insert, update, delete on table public.application_predictions to authenticated;

drop policy if exists "Users can read own application predictions" on public.application_predictions;
create policy "Users can read own application predictions"
  on public.application_predictions
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Users can create own application predictions" on public.application_predictions;
create policy "Users can create own application predictions"
  on public.application_predictions
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.citizenship_applications application
      where application.id = application_predictions.application_id
        and application.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own application predictions" on public.application_predictions;
create policy "Users can delete own application predictions"
  on public.application_predictions
  for delete
  to authenticated
  using (owner_id = auth.uid());
