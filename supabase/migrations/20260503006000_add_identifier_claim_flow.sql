create or replace function app_private.normalize_claim_identifier(p_value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    regexp_replace(lower(btrim(coalesce(p_value, ''))), '^post\s+', ''),
    '[^a-z0-9]+',
    '',
    'g'
  );
$$;

create or replace function app_private.copy_claimed_citizenship_case(p_source public.citizenship_applications)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_created_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in required.' using errcode = '28000';
  end if;

  if exists (
    select 1
    from public.citizenship_applications
    where owner_id = v_user_id
      and claimed_from_application_id = p_source.id
  ) then
    raise exception 'You already claimed this case.' using errcode = '23505';
  end if;

  insert into public.citizenship_applications (
    owner_id,
    law_type_id,
    is_public,
    claimed_from_application_id,
    applicant_label,
    submission_country,
    handling_office,
    handling_office_kind,
    application_method,
    submitted_on,
    submitted_on_raw,
    submitted_on_precision,
    aktenzeichen_on,
    aktenzeichen_on_raw,
    aktenzeichen_on_precision,
    certificate_received_on,
    certificate_received_on_raw,
    certificate_received_on_precision,
    info_updated_on,
    info_updated_on_raw,
    info_updated_on_precision,
    months_submission_to_az,
    months_az_to_certificate,
    days_az_to_today,
    days_waiting_for_reply,
    status,
    comments,
    source_record_key
  ) values (
    v_user_id,
    p_source.law_type_id,
    false,
    p_source.id,
    null,
    p_source.submission_country,
    p_source.handling_office,
    p_source.handling_office_kind,
    p_source.application_method,
    p_source.submitted_on,
    p_source.submitted_on_raw,
    p_source.submitted_on_precision,
    p_source.aktenzeichen_on,
    p_source.aktenzeichen_on_raw,
    p_source.aktenzeichen_on_precision,
    p_source.certificate_received_on,
    p_source.certificate_received_on_raw,
    p_source.certificate_received_on_precision,
    p_source.info_updated_on,
    p_source.info_updated_on_raw,
    p_source.info_updated_on_precision,
    p_source.months_submission_to_az,
    p_source.months_az_to_certificate,
    p_source.days_az_to_today,
    p_source.days_waiting_for_reply,
    p_source.status,
    null,
    null
  ) returning id into v_created_id;

  return v_created_id;
end;
$$;

create or replace function app_private.claim_citizenship_case_by_identifier(p_identifier text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_identifier text := btrim(coalesce(p_identifier, ''));
  v_normalized text := app_private.normalize_claim_identifier(p_identifier);
  v_source public.citizenship_applications%rowtype;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.' using errcode = '28000';
  end if;

  if v_normalized = '' then
    raise exception 'Enter the username, name, spreadsheet ID, row ID, or post URL from the spreadsheet.' using errcode = '22023';
  end if;

  select count(*)
  into v_count
  from public.citizenship_applications a
  where a.owner_id is null
    and a.is_public = true
    and coalesce(btrim(a.applicant_label), '') <> ''
    and (
      app_private.normalize_claim_identifier(a.applicant_label) = v_normalized
      or lower(btrim(coalesce(a.source_record_key, ''))) = lower(v_identifier)
      or a.source_row_number::text = v_identifier
    );

  if v_count = 0 then
    raise exception 'No historical case matched that identifier. If your spreadsheet row had a blank username/name/ID, choose the blank-row option and match by details.' using errcode = 'P0002';
  end if;

  if v_count > 1 then
    raise exception 'Multiple historical cases matched that identifier. Use the blank-row option and add more case details, or enter a more specific spreadsheet ID/post URL.' using errcode = '21000';
  end if;

  select a.*
  into v_source
  from public.citizenship_applications a
  where a.owner_id is null
    and a.is_public = true
    and coalesce(btrim(a.applicant_label), '') <> ''
    and (
      app_private.normalize_claim_identifier(a.applicant_label) = v_normalized
      or lower(btrim(coalesce(a.source_record_key, ''))) = lower(v_identifier)
      or a.source_row_number::text = v_identifier
    )
  order by a.source_row_number nulls last, a.id
  limit 1;

  return app_private.copy_claimed_citizenship_case(v_source);
end;
$$;

create or replace function public.claim_citizenship_case_by_identifier(p_identifier text)
returns uuid
language sql
set search_path = public, pg_temp
as $$
  select app_private.claim_citizenship_case_by_identifier(p_identifier);
$$;

grant execute on function public.claim_citizenship_case_by_identifier(text) to authenticated;

create or replace function app_private.claim_blank_citizenship_case(
  p_law_type_id text,
  p_submitted_on date,
  p_submission_country text default null,
  p_handling_office text default null,
  p_application_method text default null,
  p_aktenzeichen_on date default null,
  p_certificate_received_on date default null,
  p_aktenzeichen_not_received boolean default false,
  p_certificate_not_received boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.citizenship_applications%rowtype;
  v_count int;
begin
  if v_user_id is null then
    raise exception 'Sign in required.' using errcode = '28000';
  end if;

  if p_law_type_id is null or btrim(p_law_type_id) = '' or p_submitted_on is null then
    raise exception 'Law type and submission date are required.' using errcode = '22023';
  end if;

  if coalesce(btrim(p_submission_country), '') = ''
    and coalesce(btrim(p_handling_office), '') = ''
    and coalesce(btrim(p_application_method), '') = '' then
    raise exception 'Add a country, handling office, or application method to narrow the match.' using errcode = '22023';
  end if;

  select count(*)
  into v_count
  from public.citizenship_applications a
  where a.owner_id is null
    and a.is_public = true
    and coalesce(btrim(a.applicant_label), '') = ''
    and a.law_type_id = p_law_type_id
    and a.submitted_on = p_submitted_on
    and (
      coalesce(btrim(p_submission_country), '') = ''
      or lower(btrim(coalesce(a.submission_country, ''))) = lower(btrim(p_submission_country))
    )
    and (
      coalesce(btrim(p_handling_office), '') = ''
      or lower(btrim(coalesce(a.handling_office, ''))) = lower(btrim(p_handling_office))
    )
    and (
      coalesce(btrim(p_application_method), '') = ''
      or lower(btrim(coalesce(a.application_method, ''))) = lower(btrim(p_application_method))
    )
    and (
      p_aktenzeichen_on is null
      or a.aktenzeichen_on = p_aktenzeichen_on
    )
    and (
      p_certificate_received_on is null
      or a.certificate_received_on = p_certificate_received_on
    )
    and (
      not p_aktenzeichen_not_received
      or a.aktenzeichen_on is null
    )
    and (
      not p_certificate_not_received
      or a.certificate_received_on is null
    );

  if v_count = 0 then
    raise exception 'No blank-identifier historical case matched those details. Try fewer optional fields or add it manually.' using errcode = 'P0002';
  end if;

  if v_count > 1 then
    raise exception 'Multiple blank-identifier cases matched. Add another detail such as country, office, method, or milestone date.' using errcode = '21000';
  end if;

  select a.*
  into v_source
  from public.citizenship_applications a
  where a.owner_id is null
    and a.is_public = true
    and coalesce(btrim(a.applicant_label), '') = ''
    and a.law_type_id = p_law_type_id
    and a.submitted_on = p_submitted_on
    and (
      coalesce(btrim(p_submission_country), '') = ''
      or lower(btrim(coalesce(a.submission_country, ''))) = lower(btrim(p_submission_country))
    )
    and (
      coalesce(btrim(p_handling_office), '') = ''
      or lower(btrim(coalesce(a.handling_office, ''))) = lower(btrim(p_handling_office))
    )
    and (
      coalesce(btrim(p_application_method), '') = ''
      or lower(btrim(coalesce(a.application_method, ''))) = lower(btrim(p_application_method))
    )
    and (
      p_aktenzeichen_on is null
      or a.aktenzeichen_on = p_aktenzeichen_on
    )
    and (
      p_certificate_received_on is null
      or a.certificate_received_on = p_certificate_received_on
    )
    and (
      not p_aktenzeichen_not_received
      or a.aktenzeichen_on is null
    )
    and (
      not p_certificate_not_received
      or a.certificate_received_on is null
    )
  order by a.source_row_number nulls last, a.id
  limit 1;

  return app_private.copy_claimed_citizenship_case(v_source);
end;
$$;

create or replace function public.claim_blank_citizenship_case(
  p_law_type_id text,
  p_submitted_on date,
  p_submission_country text default null,
  p_handling_office text default null,
  p_application_method text default null,
  p_aktenzeichen_on date default null,
  p_certificate_received_on date default null,
  p_aktenzeichen_not_received boolean default false,
  p_certificate_not_received boolean default false
)
returns uuid
language sql
set search_path = public, pg_temp
as $$
  select app_private.claim_blank_citizenship_case(
    p_law_type_id,
    p_submitted_on,
    p_submission_country,
    p_handling_office,
    p_application_method,
    p_aktenzeichen_on,
    p_certificate_received_on,
    p_aktenzeichen_not_received,
    p_certificate_not_received
  );
$$;

grant execute on function public.claim_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) to authenticated;
