alter table public.citizenship_dashboard_stats
add column if not exists approval_queue_stats jsonb not null default '{}'::jsonb;

create or replace function app_private.refresh_dashboard_approval_queue_stats()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.citizenship_dashboard_stats
  set
    approval_queue_stats = queue_stats.value,
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
    ), approved_applications as (
      select
        a.*,
        date_trunc('month', a.submitted_on)::date as submitted_month,
        round((extract(day from (a.certificate_received_on::timestamptz - a.submitted_on::timestamptz)) / 30.4375)::numeric, 1) as total_wait_months
      from canonical_applications a
      where a.status = 'certificate_received'
        and a.submitted_on is not null
        and a.certificate_received_on is not null
    ), law_type_cohorts as (
      select
        submitted_month,
        law_type_id,
        count(*)::int as approved_count
      from approved_applications
      group by submitted_month, law_type_id
    ), cohorts as (
      select
        a.submitted_month,
        extract(year from a.submitted_month)::int as year_number,
        extract(month from a.submitted_month)::int as month_number,
        to_char(a.submitted_month, 'YYYY-MM') as period_key,
        to_char(a.submitted_month, 'Mon YYYY') as period_label,
        count(*)::int as approved_count,
        round(avg(a.total_wait_months), 1) as avg_submission_to_certificate_months,
        round(min(a.total_wait_months), 1) as min_submission_to_certificate_months,
        round(max(a.total_wait_months), 1) as max_submission_to_certificate_months,
        max(a.certificate_received_on) as latest_certificate_received_on,
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'law_type_id', ltc.law_type_id,
              'approved_count', ltc.approved_count
            )
            order by ltc.approved_count desc, ltc.law_type_id
          )
          from law_type_cohorts ltc
          where ltc.submitted_month = a.submitted_month
        ), '[]'::jsonb) as law_type_breakdown
      from approved_applications a
      group by a.submitted_month
    ), newest_approved as (
      select submitted_on, certificate_received_on
      from approved_applications
      order by submitted_on desc, certificate_received_on desc, id
      limit 1
    )
    select jsonb_build_object(
      'generated_at', now(),
      'total_approved_with_submission_date', count(*)::int,
      'newest_approved_submitted_on', max(newest_approved.submitted_on),
      'newest_approved_certificate_received_on', max(newest_approved.certificate_received_on),
      'newest_approved_submission_period_label', to_char(date_trunc('month', max(newest_approved.submitted_on))::date, 'Mon YYYY'),
      'median_submission_to_certificate_months', round((percentile_cont(0.5) within group (order by approved_applications.total_wait_months))::numeric, 1),
      'cohorts', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'period_key', c.period_key,
            'period_label', c.period_label,
            'year_number', c.year_number,
            'month_number', c.month_number,
            'approved_count', c.approved_count,
            'avg_submission_to_certificate_months', c.avg_submission_to_certificate_months,
            'min_submission_to_certificate_months', c.min_submission_to_certificate_months,
            'max_submission_to_certificate_months', c.max_submission_to_certificate_months,
            'latest_certificate_received_on', c.latest_certificate_received_on,
            'law_type_breakdown', c.law_type_breakdown
          )
          order by c.submitted_month
        )
        from cohorts c
      ), '[]'::jsonb)
    ) as value
    from approved_applications
    left join newest_approved on true
  ) queue_stats
  where public.citizenship_dashboard_stats.id = true;
end;
$$;

create or replace function app_private.refresh_citizenship_dashboard_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform app_private.refresh_citizenship_dashboard_stats();
  perform app_private.refresh_dashboard_activity_highlights();
  perform app_private.refresh_dashboard_approval_queue_stats();
  return coalesce(new, old);
end;
$$;

select app_private.refresh_dashboard_approval_queue_stats();
