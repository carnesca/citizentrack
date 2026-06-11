create unique index if not exists citizenship_applications_owner_claimed_source_unique
  on public.citizenship_applications(owner_id, claimed_from_application_id)
  where owner_id is not null
    and claimed_from_application_id is not null;

create or replace function app_private.claim_match_summary(p_source public.citizenship_applications)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'source_row_number', p_source.source_row_number,
    'law_type_id', p_source.law_type_id,
    'law_type', coalesce((select lt.display_name from public.citizenship_law_types lt where lt.id = p_source.law_type_id), p_source.law_type_id),
    'submitted_on', p_source.submitted_on,
    'submission_country', nullif(btrim(coalesce(p_source.submission_country, '')), ''),
    'handling_office', nullif(btrim(coalesce(p_source.handling_office, '')), ''),
    'application_method', nullif(btrim(coalesce(p_source.application_method, '')), ''),
    'aktenzeichen_on', p_source.aktenzeichen_on,
    'certificate_received_on', p_source.certificate_received_on,
    'status', p_source.status
  );
$$;

create or replace function app_private.identifier_claim_candidates(p_identifier text)
returns setof public.citizenship_applications
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.*
  from public.citizenship_applications a
  cross join (
    select
      btrim(coalesce(p_identifier, '')) as identifier,
      app_private.normalize_claim_identifier(p_identifier) as normalized_identifier
  ) input
  where input.normalized_identifier <> ''
    and a.owner_id is null
    and a.is_public = true
    and coalesce(btrim(a.applicant_label), '') <> ''
    and (
      app_private.normalize_claim_identifier(a.applicant_label) = input.normalized_identifier
      or lower(btrim(coalesce(a.source_record_key, ''))) = lower(input.identifier)
      or a.source_row_number::text = input.identifier
    );
$$;

create or replace function app_private.blank_claim_candidates(
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
returns setof public.citizenship_applications
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.*
  from public.citizenship_applications a
  where p_law_type_id is not null
    and btrim(p_law_type_id) <> ''
    and p_submitted_on is not null
    and a.owner_id is null
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
$$;

create or replace function app_private.preview_claim_citizenship_case_by_identifier(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized text := app_private.normalize_claim_identifier(p_identifier);
  v_count int;
  v_already_claimed boolean;
  v_possible_matches jsonb;
begin
  if v_user_id is null then
    raise exception 'Sign in required.' using errcode = '28000';
  end if;

  if v_normalized = '' then
    raise exception 'Enter the username, name, spreadsheet ID, or row ID from the spreadsheet.' using errcode = '22023';
  end if;

  select
    count(*)::int,
    coalesce(bool_or(exists (
      select 1
      from public.citizenship_applications claimed
      where claimed.owner_id = v_user_id
        and claimed.claimed_from_application_id = candidate.id
    )), false)
  into v_count, v_already_claimed
  from app_private.identifier_claim_candidates(p_identifier) candidate;

  select coalesce(jsonb_agg(summary.value order by summary.source_row_number nulls last, summary.id), '[]'::jsonb)
  into v_possible_matches
  from (
    select
      candidate.source_row_number,
      candidate.id,
      app_private.claim_match_summary(candidate) as value
    from app_private.identifier_claim_candidates(p_identifier) candidate
    order by candidate.source_row_number nulls last, candidate.id
    limit 5
  ) summary;

  if v_count = 0 then
    return jsonb_build_object(
      'status', 'no_match',
      'can_confirm', false,
      'match_count', 0,
      'possible_matches', '[]'::jsonb,
      'message', 'No historical case matched that identifier. If your spreadsheet row had a blank username/name/ID, choose the blank-row option and match by details.'
    );
  end if;

  if v_count > 1 then
    return jsonb_build_object(
      'status', 'refine',
      'can_confirm', false,
      'match_count', v_count,
      'possible_matches', v_possible_matches,
      'possible_match_limit', 5,
      'message', 'Multiple historical cases matched. Add a more specific spreadsheet ID, row ID, or use the blank-row option with more case details.'
    );
  end if;

  if v_already_claimed then
    return jsonb_build_object(
      'status', 'already_claimed',
      'can_confirm', false,
      'match_count', 1,
      'match', v_possible_matches->0,
      'possible_matches', v_possible_matches,
      'message', 'You already claimed this case.'
    );
  end if;

  return jsonb_build_object(
    'status', 'ready_to_confirm',
    'can_confirm', true,
    'match_count', 1,
    'match', v_possible_matches->0,
    'possible_matches', v_possible_matches,
    'message', 'One safe historical match was found. Confirm to copy it into your private account.'
  );
end;
$$;

create or replace function app_private.confirm_claim_citizenship_case_by_identifier(p_identifier text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized text := app_private.normalize_claim_identifier(p_identifier);
  v_source public.citizenship_applications%rowtype;
  v_count int;
begin
  if v_user_id is null then
    raise exception 'Sign in required.' using errcode = '28000';
  end if;

  if v_normalized = '' then
    raise exception 'Enter the username, name, spreadsheet ID, or row ID from the spreadsheet.' using errcode = '22023';
  end if;

  select count(*)::int
  into v_count
  from app_private.identifier_claim_candidates(p_identifier);

  if v_count = 0 then
    raise exception 'No historical case matched that identifier. Preview again with refined details.' using errcode = 'P0002';
  end if;

  if v_count > 1 then
    raise exception 'Multiple historical cases still match. Refine the claim details before confirming.' using errcode = '21000';
  end if;

  select candidate.*
  into v_source
  from app_private.identifier_claim_candidates(p_identifier) candidate
  order by candidate.source_row_number nulls last, candidate.id
  limit 1;

  return app_private.copy_claimed_citizenship_case(v_source);
end;
$$;

create or replace function app_private.preview_blank_citizenship_case(
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
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
  v_already_claimed boolean;
  v_possible_matches jsonb;
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

  select
    count(*)::int,
    coalesce(bool_or(exists (
      select 1
      from public.citizenship_applications claimed
      where claimed.owner_id = v_user_id
        and claimed.claimed_from_application_id = candidate.id
    )), false)
  into v_count, v_already_claimed
  from app_private.blank_claim_candidates(
    p_law_type_id,
    p_submitted_on,
    p_submission_country,
    p_handling_office,
    p_application_method,
    p_aktenzeichen_on,
    p_certificate_received_on,
    p_aktenzeichen_not_received,
    p_certificate_not_received
  ) candidate;

  select coalesce(jsonb_agg(summary.value order by summary.source_row_number nulls last, summary.id), '[]'::jsonb)
  into v_possible_matches
  from (
    select
      candidate.source_row_number,
      candidate.id,
      app_private.claim_match_summary(candidate) as value
    from app_private.blank_claim_candidates(
      p_law_type_id,
      p_submitted_on,
      p_submission_country,
      p_handling_office,
      p_application_method,
      p_aktenzeichen_on,
      p_certificate_received_on,
      p_aktenzeichen_not_received,
      p_certificate_not_received
    ) candidate
    order by candidate.source_row_number nulls last, candidate.id
    limit 5
  ) summary;

  if v_count = 0 then
    return jsonb_build_object(
      'status', 'no_match',
      'can_confirm', false,
      'match_count', 0,
      'possible_matches', '[]'::jsonb,
      'message', 'No blank-identifier historical case matched those details. Try fewer optional fields or add it manually.'
    );
  end if;

  if v_count > 1 then
    return jsonb_build_object(
      'status', 'refine',
      'can_confirm', false,
      'match_count', v_count,
      'possible_matches', v_possible_matches,
      'possible_match_limit', 5,
      'message', 'Multiple blank-identifier cases matched. Add another detail such as country, office, method, or milestone date.'
    );
  end if;

  if v_already_claimed then
    return jsonb_build_object(
      'status', 'already_claimed',
      'can_confirm', false,
      'match_count', 1,
      'match', v_possible_matches->0,
      'possible_matches', v_possible_matches,
      'message', 'You already claimed this case.'
    );
  end if;

  return jsonb_build_object(
    'status', 'ready_to_confirm',
    'can_confirm', true,
    'match_count', 1,
    'match', v_possible_matches->0,
    'possible_matches', v_possible_matches,
    'message', 'One safe blank-row match was found. Confirm to copy it into your private account.'
  );
end;
$$;

create or replace function app_private.confirm_blank_citizenship_case(
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

  select count(*)::int
  into v_count
  from app_private.blank_claim_candidates(
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

  if v_count = 0 then
    raise exception 'No blank-identifier historical case matched those details. Preview again with refined details.' using errcode = 'P0002';
  end if;

  if v_count > 1 then
    raise exception 'Multiple blank-identifier cases still match. Refine the claim details before confirming.' using errcode = '21000';
  end if;

  select candidate.*
  into v_source
  from app_private.blank_claim_candidates(
    p_law_type_id,
    p_submitted_on,
    p_submission_country,
    p_handling_office,
    p_application_method,
    p_aktenzeichen_on,
    p_certificate_received_on,
    p_aktenzeichen_not_received,
    p_certificate_not_received
  ) candidate
  order by candidate.source_row_number nulls last, candidate.id
  limit 1;

  return app_private.copy_claimed_citizenship_case(v_source);
end;
$$;

create or replace function public.preview_claim_citizenship_case_by_identifier(p_identifier text)
returns jsonb
language sql
set search_path = public, pg_temp
as $$
  select app_private.preview_claim_citizenship_case_by_identifier(p_identifier);
$$;

create or replace function public.confirm_claim_citizenship_case_by_identifier(p_identifier text)
returns uuid
language sql
set search_path = public, pg_temp
as $$
  select app_private.confirm_claim_citizenship_case_by_identifier(p_identifier);
$$;

create or replace function public.preview_blank_citizenship_case(
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
returns jsonb
language sql
set search_path = public, pg_temp
as $$
  select app_private.preview_blank_citizenship_case(
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

create or replace function public.confirm_blank_citizenship_case(
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
  select app_private.confirm_blank_citizenship_case(
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

revoke execute on function public.claim_citizenship_case_by_identifier(text) from public, anon, authenticated;
revoke execute on function public.claim_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) from public, anon, authenticated;

revoke execute on function public.preview_claim_citizenship_case_by_identifier(text) from public, anon;
revoke execute on function public.confirm_claim_citizenship_case_by_identifier(text) from public, anon;
revoke execute on function public.preview_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) from public, anon;
revoke execute on function public.confirm_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) from public, anon;

grant execute on function public.preview_claim_citizenship_case_by_identifier(text) to authenticated;
grant execute on function public.confirm_claim_citizenship_case_by_identifier(text) to authenticated;
grant execute on function public.preview_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) to authenticated;
grant execute on function public.confirm_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) to authenticated;

grant usage on schema app_private to authenticated;
revoke execute on function app_private.normalize_claim_identifier(text) from public, anon, authenticated;
revoke execute on function app_private.claim_match_summary(public.citizenship_applications) from public, anon, authenticated;
revoke execute on function app_private.identifier_claim_candidates(text) from public, anon, authenticated;
revoke execute on function app_private.blank_claim_candidates(text, date, text, text, text, date, date, boolean, boolean) from public, anon, authenticated;
revoke execute on function app_private.copy_claimed_citizenship_case(public.citizenship_applications) from public, anon, authenticated;
revoke execute on function app_private.claim_citizenship_case_by_identifier(text) from public, anon, authenticated;
revoke execute on function app_private.claim_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) from public, anon, authenticated;
revoke execute on function app_private.preview_claim_citizenship_case_by_identifier(text) from public, anon;
revoke execute on function app_private.confirm_claim_citizenship_case_by_identifier(text) from public, anon;
revoke execute on function app_private.preview_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) from public, anon;
revoke execute on function app_private.confirm_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) from public, anon;

grant execute on function app_private.preview_claim_citizenship_case_by_identifier(text) to authenticated;
grant execute on function app_private.confirm_claim_citizenship_case_by_identifier(text) to authenticated;
grant execute on function app_private.preview_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) to authenticated;
grant execute on function app_private.confirm_blank_citizenship_case(text, date, text, text, text, date, date, boolean, boolean) to authenticated;
