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
    )
    select jsonb_build_object(
      'latest_application_added_at', max(ca.created_at) filter (where ca.owner_id is not null),
      'latest_application_updated_at', max(ca.updated_at) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second'),
      'latest_approval_recorded_on', max(ca.certificate_received_on) filter (where ca.certificate_received_on is not null and ca.status = 'certificate_received'),
      'applications_added_last_7_days', count(*) filter (where ca.owner_id is not null and ca.created_at >= now() - interval '7 days'),
      'applications_added_last_30_days', count(*) filter (where ca.owner_id is not null and ca.created_at >= now() - interval '30 days'),
      'applications_updated_last_7_days', count(*) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second' and ca.updated_at >= now() - interval '7 days'),
      'applications_updated_last_30_days', count(*) filter (where ca.owner_id is not null and ca.updated_at > ca.created_at + interval '1 second' and ca.updated_at >= now() - interval '30 days'),
      'applications_approved_last_30_days', count(*) filter (where ca.certificate_received_on >= current_date - interval '30 days' and ca.status = 'certificate_received'),
      'approved_cases_with_file_number_count', count(*) filter (where ca.status = 'certificate_received' and ca.aktenzeichen_on is not null),
      'avg_approved_submission_to_file_months', round(avg(ca.months_submission_to_az) filter (where ca.status = 'certificate_received' and ca.months_submission_to_az is not null), 1),
      'avg_approved_file_to_certificate_months', round(avg(ca.months_az_to_certificate) filter (where ca.status = 'certificate_received' and ca.months_az_to_certificate is not null), 1),
      'avg_approved_total_months', round(avg(ca.months_submission_to_az + ca.months_az_to_certificate) filter (where ca.status = 'certificate_received' and ca.months_submission_to_az is not null and ca.months_az_to_certificate is not null), 1)
    ) as value
    from canonical_applications ca
  ) highlights
  where public.citizenship_dashboard_stats.id = true;
end;
$$;

select app_private.refresh_dashboard_activity_highlights();
