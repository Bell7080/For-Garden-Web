-- Review and apply once to the intended project. Existing game tables are untouched.
begin;
create table public.website_notices (id uuid primary key default gen_random_uuid(),slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{0,100}$'),category text not null check(category in ('notice','development','event')),status text not null default 'draft' check(status in ('draft','published')),published_at timestamptz not null default now(),created_at timestamptz not null default now());
create table public.website_notice_translations (notice_id uuid not null references public.website_notices(id) on delete cascade,locale text not null check(locale in ('ko','en','ja')),title text not null check(length(title) between 1 and 200),summary text not null default '',body text not null check(length(body) between 1 and 50000),primary key(notice_id,locale));
create table public.website_preregistrations (id uuid primary key default gen_random_uuid(),email text not null unique,platform text not null check(platform in ('android','ios','both')),locale text not null check(locale in ('ko','en','ja')),consent_version text not null default 'launch-notification-v1',consented_at timestamptz not null default now(),created_at timestamptz not null default now());
create table public.website_registration_limits (fingerprint text not null,bucket timestamptz not null,attempts integer not null default 1,primary key(fingerprint,bucket));
alter table public.website_notices enable row level security;
alter table public.website_notice_translations enable row level security;
alter table public.website_preregistrations enable row level security;
alter table public.website_registration_limits enable row level security;
revoke all on public.website_notices,public.website_notice_translations,public.website_preregistrations,public.website_registration_limits from anon,authenticated;
grant all on public.website_notices,public.website_notice_translations,public.website_preregistrations,public.website_registration_limits to service_role;
create index website_notices_published on public.website_notices(published_at desc) where status='published';
create or replace function public.register_website_interest(p_email text,p_platform text,p_locale text,p_fingerprint text)
returns text language plpgsql security definer set search_path='' as $$
declare used integer;
begin
 if length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_platform not in ('android','ios','both') or p_locale not in ('ko','en','ja') or length(p_fingerprint)<>64 then raise exception 'invalid input'; end if;
 insert into public.website_registration_limits(fingerprint,bucket) values(p_fingerprint,date_trunc('hour',now())) on conflict(fingerprint,bucket) do update set attempts=public.website_registration_limits.attempts+1 returning attempts into used;
 if used>5 then return 'rate_limited'; end if;
 insert into public.website_preregistrations(email,platform,locale) values(lower(trim(p_email)),p_platform,p_locale) on conflict(email) do nothing;
 delete from public.website_registration_limits where bucket<now()-interval '2 days';
 return 'accepted';
end;
$$;
revoke all on function public.register_website_interest(text,text,text,text) from public,anon,authenticated;
grant execute on function public.register_website_interest(text,text,text,text) to service_role;
commit;
