-- RavRadar 4.0.215: privat, dataminimeret besøgsstatistik.
-- Der gemmes kun samlede dagstal og ingen oplysninger, som identificerer eller profilerer en besøgende.

create table if not exists public.visitor_statistics_daily (
  day date primary key,
  page_views bigint not null default 0 check (page_views >= 0),
  browser_visits bigint not null default 0 check (browser_visits >= 0),
  updated_at timestamptz not null default now()
);

alter table public.visitor_statistics_daily enable row level security;
revoke all on table public.visitor_statistics_daily from public, anon, authenticated;

create or replace function public.record_ravradar_page_view(p_new_visit boolean default false)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.visitor_statistics_daily(day, page_views, browser_visits, updated_at)
  values ((now() at time zone 'Europe/Copenhagen')::date, 1, case when coalesce(p_new_visit,false) then 1 else 0 end, now())
  on conflict (day) do update set
    page_views = public.visitor_statistics_daily.page_views + 1,
    browser_visits = public.visitor_statistics_daily.browser_visits + excluded.browser_visits,
    updated_at = now();
$$;

revoke all on function public.record_ravradar_page_view(boolean) from public;
grant execute on function public.record_ravradar_page_view(boolean) to anon, authenticated;

create or replace function public.get_ravradar_visitor_report(p_from_day date, p_to_day date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not (public.is_ravradar_owner() or public.has_ravradar_permission('full_admin')) then
    raise exception 'PERMISSION_DENIED' using errcode='42501';
  end if;
  if p_from_day is null or p_to_day is null or p_from_day > p_to_day or p_to_day - p_from_day > 366 then
    raise exception 'INVALID_PERIOD' using errcode='22023';
  end if;
  select jsonb_build_object(
    'fromDay', p_from_day,
    'toDay', p_to_day,
    'pageViews', coalesce(sum(page_views),0),
    'browserVisits', coalesce(sum(browser_visits),0),
    'registeredAccounts', (select count(*) from public.profiles),
    'activeAccounts', (select count(*) from public.profiles where is_active),
    'days', coalesce(jsonb_agg(jsonb_build_object('day',day,'pageViews',page_views,'browserVisits',browser_visits) order by day desc),'[]'::jsonb)
  ) into result
  from public.visitor_statistics_daily
  where day between p_from_day and p_to_day;
  return result;
end;
$$;

revoke all on function public.get_ravradar_visitor_report(date,date) from public, anon;
grant execute on function public.get_ravradar_visitor_report(date,date) to authenticated;
