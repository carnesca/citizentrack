update public.citizenship_law_types
set display_name = 'StAG 5'
where id = '5_stag_erklarung';

select app_private.refresh_citizenship_dashboard_stats();
select app_private.refresh_dashboard_activity_highlights();
select app_private.refresh_dashboard_approval_queue_stats();
