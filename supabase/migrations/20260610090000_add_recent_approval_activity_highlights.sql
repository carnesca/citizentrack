create or replace function app_private.refresh_dashboard_activity_highlights()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.citizenship_dashboard_stats
  set
    activity_highlights = highlights.value,
    refreshed_at = now()
  from (
    with claimed_canonical as (
      select distinct on (a.claimed_from_application_id) a.*
      from public.citizenship_applications a
      where a.claimed_from_application_id is not null
      order by a.claimed_from_application_id, a.updated_at desc nulls last, a.created_at desc nulls last, a.id
    ), canonical_applications as (
      select a.*
      from public.citizenship_applications a
      where a.claimed_from_application_id is null
        and not (
          a.owner_id is null
          and a.is_public = true
          and exists (
            select 1
            from claimed_canonical c
            where c.claimed_from_application_id = a.id
          )
        )
      union all
      select c.*
      from claimed_canonical c
    ), activity_bounds as (
      select
        max(ca.created_at) filter (where ca.owner_id is not null) as latest_added_at,
        max(ca.updated_at) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second') as latest_updated_at
      from canonical_applications ca
    ), recent_approval_counts as (
      select
        count(*) filter (
          where ca.certificate_received_on >= current_date - interval '30 days'
            and ca.status = 'certificate_received'
        )::int as recent_count,
        count(*) filter (
          where ca.certificate_received_on >= current_date - interval '60 days'
            and ca.certificate_received_on < current_date - interval '30 days'
            and ca.status = 'certificate_received'
        )::int as previous_count
      from canonical_applications ca
    ), approved_law_types as (
      select
        ca.law_type_id,
        lt.display_name,
        lt.sort_order,
        count(*)::int as approved_count
      from canonical_applications ca
      join public.citizenship_law_types lt on lt.id = ca.law_type_id
      where ca.status = 'certificate_received'
      group by ca.law_type_id, lt.display_name, lt.sort_order
    ), most_active_approved_law_type as (
      select
        ralt.law_type_id,
        ralt.display_name,
        ralt.approved_count
      from approved_law_types ralt
      order by ralt.approved_count desc, ralt.sort_order, ralt.display_name, ralt.law_type_id
      limit 1
    ), application_law_types as (
      select
        ca.law_type_id,
        lt.display_name,
        lt.sort_order,
        count(*)::int as activity_count
      from canonical_applications ca
      join public.citizenship_law_types lt on lt.id = ca.law_type_id
      where ca.owner_id is not null
      group by ca.law_type_id, lt.display_name, lt.sort_order
    ), most_active_application_law_type as (
      select
        ralt.law_type_id,
        ralt.display_name,
        ralt.activity_count
      from application_law_types ralt
      order by ralt.activity_count desc, ralt.sort_order, ralt.display_name, ralt.law_type_id
      limit 1
    )
    select jsonb_build_object(
      'latest_application_added_at', max(ca.created_at) filter (where ca.owner_id is not null),
      'latest_application_updated_at', max(ca.updated_at) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second'),
      'latest_application_activity_at', greatest(coalesce(max(ab.latest_added_at), '-infinity'::timestamptz), coalesce(max(ab.latest_updated_at), '-infinity'::timestamptz)),
      'latest_application_activity_kind', case
        when max(ab.latest_updated_at) is not null and (max(ab.latest_added_at) is null or max(ab.latest_updated_at) > max(ab.latest_added_at)) then 'updated'
        when max(ab.latest_added_at) is not null then 'added'
        else null
      end,
      'latest_approval_recorded_on', max(ca.certificate_received_on) filter (where ca.certificate_received_on is not null and ca.status = 'certificate_received'),
      'applications_added_today', count(*) filter (where ca.owner_id is not null and (ca.created_at at time zone 'America/Chicago')::date = (now() at time zone 'America/Chicago')::date),
      'applications_updated_today', count(*) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second' and (ca.updated_at at time zone 'America/Chicago')::date = (now() at time zone 'America/Chicago')::date),
      'applications_added_last_7_days', count(*) filter (where ca.owner_id is not null and ca.created_at >= now() - interval '7 days'),
      'applications_added_previous_7_days', count(*) filter (where ca.owner_id is not null and ca.created_at >= now() - interval '14 days' and ca.created_at < now() - interval '7 days'),
      'applications_added_last_30_days', count(*) filter (where ca.owner_id is not null and ca.created_at >= now() - interval '30 days'),
      'applications_updated_last_7_days', count(*) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second' and ca.updated_at >= now() - interval '7 days'),
      'applications_updated_previous_7_days', count(*) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second' and ca.updated_at >= now() - interval '14 days' and ca.updated_at < now() - interval '7 days'),
      'applications_updated_last_30_days', count(*) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second' and ca.updated_at >= now() - interval '30 days'),
      'most_active_application_law_type', case
        when max(maapp.law_type_id) is null then null
        else jsonb_build_object(
          'law_type_id', max(maapp.law_type_id),
          'display_name', max(maapp.display_name),
          'activity_count', max(maapp.activity_count)
        )
      end,
      'applications_approved_last_30_days', coalesce(max(rac.recent_count), 0),
      'approvals_recent_period_days', 30,
      'approvals_recent_period_count', coalesce(max(rac.recent_count), 0),
      'approvals_previous_period_count', coalesce(max(rac.previous_count), 0),
      'approvals_recent_period_change', coalesce(max(rac.recent_count), 0) - coalesce(max(rac.previous_count), 0),
      'most_active_approved_law_type', case
        when max(maalt.law_type_id) is null then null
        else jsonb_build_object(
          'law_type_id', max(maalt.law_type_id),
          'display_name', max(maalt.display_name),
          'approvals_recent_period_count', max(maalt.approved_count)
        )
      end,
      'approved_cases_with_file_number_count', count(*) filter (where ca.status = 'certificate_received' and ca.aktenzeichen_on is not null),
      'avg_approved_submission_to_file_months', round(avg(ca.months_submission_to_az) filter (where ca.status = 'certificate_received' and ca.months_submission_to_az is not null), 1),
      'avg_approved_file_to_certificate_months', round(avg(ca.months_az_to_certificate) filter (where ca.status = 'certificate_received' and ca.months_az_to_certificate is not null), 1),
      'avg_approved_total_months', round(avg(ca.months_submission_to_az + ca.months_az_to_certificate) filter (where ca.status = 'certificate_received' and ca.months_submission_to_az is not null and ca.months_az_to_certificate is not null), 1)
    ) as value
    from canonical_applications ca
    cross join activity_bounds ab
    cross join recent_approval_counts rac
    left join most_active_approved_law_type maalt on true
    left join most_active_application_law_type maapp on true
  ) highlights
  where public.citizenship_dashboard_stats.id = true;
end;
$$;

select app_private.refresh_dashboard_activity_highlights();
