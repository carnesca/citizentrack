create or replace function app_private.refresh_citizenship_dashboard_stats()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.citizenship_dashboard_stats (
    id,
    total_applications,
    pending_applications,
    approved_applications,
    rejected_applications,
    law_type_stats,
    monthly_trends,
    authority_stats,
    activity_highlights,
    refreshed_at
  )
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
  select
    true,
    count(*)::int,
    count(*) filter (where status in ('submitted', 'aktenzeichen_received', 'unknown'))::int,
    count(*) filter (where status = 'certificate_received')::int,
    count(*) filter (where status = 'rejected')::int,
    coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order)
      from (
        select
          lt.id as law_type_id,
          lt.display_name,
          lt.sort_order,
          count(a.*)::int as total,
          count(a.*) filter (where a.status in ('submitted', 'aktenzeichen_received', 'unknown'))::int as pending,
          count(a.*) filter (where a.status = 'certificate_received')::int as approved,
          count(a.*) filter (where a.status = 'rejected')::int as rejected,
          round(avg(a.months_submission_to_az) filter (where a.months_submission_to_az is not null), 1) as avg_submission_to_az_months,
          round(avg(a.months_az_to_certificate) filter (where a.months_az_to_certificate is not null), 1) as avg_az_to_certificate_months,
          round(avg(a.months_submission_to_az + a.months_az_to_certificate) filter (where a.months_submission_to_az is not null and a.months_az_to_certificate is not null), 1) as avg_total_submission_to_certificate_months,
          round((percentile_cont(0.5) within group (order by a.months_az_to_certificate) filter (where a.months_az_to_certificate is not null))::numeric, 1) as median_az_to_certificate_months,
          round(min(a.months_az_to_certificate) filter (where a.months_az_to_certificate is not null), 1) as min_az_to_certificate_months,
          round(max(a.months_az_to_certificate) filter (where a.months_az_to_certificate is not null), 1) as max_az_to_certificate_months,
          round(avg(extract(day from (now() - a.submitted_on::timestamptz)) / 30.4375) filter (where a.submitted_on is not null and a.certificate_received_on is null), 1) as avg_waiting_since_submission_months,
          round(min(extract(day from (now() - a.submitted_on::timestamptz)) / 30.4375) filter (where a.submitted_on is not null and a.certificate_received_on is null), 1) as min_waiting_since_submission_months,
          round(max(extract(day from (now() - a.submitted_on::timestamptz)) / 30.4375) filter (where a.submitted_on is not null and a.certificate_received_on is null), 1) as max_waiting_since_submission_months
        from public.citizenship_law_types lt
        left join canonical_applications a on a.law_type_id = lt.id
        group by lt.id, lt.display_name, lt.sort_order
      ) x
    ), '[]'::jsonb),
    coalesce((
      with bounds as (
        select
          date_trunc('month', min(d))::date as start_month,
          date_trunc('month', greatest(max(d), current_date))::date as end_month
        from (
          select submitted_on as d from canonical_applications where submitted_on is not null
          union all
          select certificate_received_on as d
          from canonical_applications
          where certificate_received_on is not null
            and status = 'certificate_received'
        ) dates
      ), months as (
        select gs::date as month_start
        from bounds b,
        generate_series(coalesce(b.start_month, date_trunc('month', current_date)::date), coalesce(b.end_month, date_trunc('month', current_date)::date), interval '1 month') gs
      )
      select jsonb_agg(to_jsonb(m) order by m.year_number, m.month_number)
      from (
        select
          extract(year from months.month_start)::int as year_number,
          extract(month from months.month_start)::int as month_number,
          to_char(months.month_start, 'Mon') as month_label,
          to_char(months.month_start, 'YYYY-MM') as period_key,
          to_char(months.month_start, 'Mon YYYY') as period_label,
          count(a.*) filter (where date_trunc('month', a.submitted_on)::date = months.month_start)::int as submissions,
          count(a.*) filter (
            where date_trunc('month', a.certificate_received_on)::date = months.month_start
              and a.status = 'certificate_received'
          )::int as approvals
        from months
        left join canonical_applications a on true
        group by months.month_start
        order by months.month_start
      ) m
    ), '[]'::jsonb),
    '[]'::jsonb,
    jsonb_build_object(
      'latest_application_added_at', max(created_at),
      'latest_application_updated_at', max(updated_at),
      'latest_approval_recorded_on', max(certificate_received_on) filter (where certificate_received_on is not null and status = 'certificate_received'),
      'applications_added_last_30_days', count(*) filter (where created_at >= now() - interval '30 days'),
      'applications_approved_last_30_days', count(*) filter (where certificate_received_on >= current_date - interval '30 days' and status = 'certificate_received'),
      'approved_cases_with_file_number_count', count(*) filter (where status = 'certificate_received' and aktenzeichen_on is not null),
      'avg_approved_submission_to_file_months', round(avg(months_submission_to_az) filter (where status = 'certificate_received' and months_submission_to_az is not null), 1),
      'avg_approved_file_to_certificate_months', round(avg(months_az_to_certificate) filter (where status = 'certificate_received' and months_az_to_certificate is not null), 1),
      'avg_approved_total_months', round(avg(months_submission_to_az + months_az_to_certificate) filter (where status = 'certificate_received' and months_submission_to_az is not null and months_az_to_certificate is not null), 1)
    ),
    now()
  from canonical_applications
  on conflict (id) do update set
    total_applications = excluded.total_applications,
    pending_applications = excluded.pending_applications,
    approved_applications = excluded.approved_applications,
    rejected_applications = excluded.rejected_applications,
    law_type_stats = excluded.law_type_stats,
    monthly_trends = excluded.monthly_trends,
    authority_stats = excluded.authority_stats,
    activity_highlights = excluded.activity_highlights,
    refreshed_at = excluded.refreshed_at;
end;
$$;

select app_private.refresh_citizenship_dashboard_stats();
select app_private.refresh_dashboard_activity_highlights();
select app_private.refresh_dashboard_approval_queue_stats();
