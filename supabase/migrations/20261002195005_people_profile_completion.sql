alter table public.people
  add constraint people_username_not_reserved_check
  check (
    username <> all (
      array[
        'clauble',
        'admin',
        'administrator',
        'moderator',
        'support',
        'system',
        'security',
        'staff',
        'team',
        'official',
        'auth',
        'api',
        'account',
        'accounts',
        'settings',
        'login',
        'logout',
        'signup',
        'register',
        'onboarding',
        'notifications',
        'search',
        'people',
        'person',
        'companies',
        'company',
        'topics',
        'signals',
        'signal',
        'workspace',
        'billing',
        'plus',
        'www',
        'root',
        'null',
        'undefined',
        'me'
      ]::text[]
    )
  );

update public.people
set profile_completed_at = created_at
where profile_completed_at is null;

alter table public.people
  alter column profile_completed_at set default now(),
  alter column profile_completed_at set not null;

revoke insert (profile_completed_at) on public.people from authenticated;
revoke update (profile_completed_at) on public.people from authenticated;
