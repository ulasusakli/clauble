begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(57);

select has_table('public', 'people', 'public.people exists');

select columns_are(
  'public',
  'people',
  array[
    'id',
    'username',
    'display_name',
    'headline',
    'bio',
    'avatar_path',
    'website_url',
    'status',
    'profile_completed_at',
    'created_at',
    'updated_at'
  ],
  'public.people has exactly the Cycle 00D columns'
);

select col_type_is('public', 'people', 'id', 'uuid', 'id is uuid');
select col_type_is('public', 'people', 'username', 'text', 'username is text');
select col_type_is('public', 'people', 'display_name', 'text', 'display_name is text');
select col_type_is('public', 'people', 'headline', 'text', 'headline is text');
select col_type_is('public', 'people', 'bio', 'text', 'bio is text');
select col_type_is('public', 'people', 'avatar_path', 'text', 'avatar_path is text');
select col_type_is('public', 'people', 'website_url', 'text', 'website_url is text');
select col_type_is(
  'public',
  'people',
  'profile_completed_at',
  'timestamp with time zone',
  'profile_completed_at is timestamptz'
);
select col_type_is(
  'public',
  'people',
  'created_at',
  'timestamp with time zone',
  'created_at is timestamptz'
);
select col_type_is(
  'public',
  'people',
  'updated_at',
  'timestamp with time zone',
  'updated_at is timestamptz'
);

select is(
  (
    select udt_schema || '.' || udt_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'people' and column_name = 'status'
  ),
  'public.person_status',
  'status uses public.person_status'
);

select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'people' and column_name = 'status'
  ),
  '''active''::person_status',
  'status defaults to active'
);

select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'people' and column_name = 'created_at'
  ),
  'now()',
  'created_at defaults to now()'
);

select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'people' and column_name = 'updated_at'
  ),
  'now()',
  'updated_at defaults to now()'
);

select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'people'
      and column_name = 'profile_completed_at'
  ),
  'now()',
  'profile_completed_at defaults to now()'
);

select col_not_null(
  'public',
  'people',
  'profile_completed_at',
  'profile_completed_at is required after profile creation'
);

select col_is_pk('public', 'people', 'id', 'id is the primary key');

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.people'::regclass
      and conname = 'people_id_fkey'
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
  ),
  'id references auth.users primary key'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.people'::regclass
      and conname = 'people_id_fkey'
      and confdeltype = 'r'
  ),
  'auth.users deletion is restricted'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.people'::regclass
      and conname = 'people_username_key'
      and contype = 'u'
  ),
  'username has an ordinary unique constraint'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.people'::regclass
      and conname = 'people_username_format_check'
      and contype = 'c'
  ),
  'username format constraint exists'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.people'::regclass
      and conname = 'people_username_not_reserved_check'
      and contype = 'c'
  ),
  'reserved username constraint exists'
);

select has_index(
  'public',
  'people',
  'people_status_idx',
  'status is indexed for public-visibility policies'
);

select has_type('public', 'person_status', 'person_status enum exists');

select is(
  (
    select array_agg(enumlabel order by enumsortorder)
    from pg_enum
    where enumtypid = 'public.person_status'::regtype
  ),
  array['active', 'suspended', 'deactivated', 'deleted']::name[],
  'person_status has exactly the expected ordered values'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.people'::regclass),
  'RLS is enabled on public.people'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'people'),
  4,
  'public.people has exactly four RLS policies'
);

select is(
  (
    select array_agg(policyname order by policyname)
    from pg_policies
    where schemaname = 'public' and tablename = 'people'
  ),
  array[
    'people_insert_own',
    'people_select_active',
    'people_select_own',
    'people_update_own'
  ]::name[],
  'public.people has only the expected policies'
);

select ok(has_table_privilege('anon', 'public.people', 'SELECT'), 'anon has SELECT');
select ok(not has_table_privilege('anon', 'public.people', 'INSERT'), 'anon lacks INSERT');
select ok(not has_table_privilege('anon', 'public.people', 'UPDATE'), 'anon lacks UPDATE');
select ok(not has_table_privilege('anon', 'public.people', 'DELETE'), 'anon lacks DELETE');

select ok(
  has_table_privilege('authenticated', 'public.people', 'SELECT'),
  'authenticated has SELECT'
);
select ok(
  not has_table_privilege('authenticated', 'public.people', 'DELETE'),
  'authenticated lacks DELETE'
);

select ok(
  has_column_privilege('authenticated', 'public.people', 'id', 'INSERT'),
  'authenticated may provide id on INSERT'
);
select ok(
  has_column_privilege('authenticated', 'public.people', 'username', 'INSERT'),
  'authenticated may provide username on INSERT'
);
select ok(
  has_column_privilege('authenticated', 'public.people', 'display_name', 'INSERT'),
  'authenticated may provide display_name on INSERT'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'profile_completed_at', 'INSERT'),
  'authenticated cannot provide profile_completed_at on INSERT'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'status', 'INSERT'),
  'authenticated cannot provide status on INSERT'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'created_at', 'INSERT'),
  'authenticated cannot provide created_at on INSERT'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'updated_at', 'INSERT'),
  'authenticated cannot provide updated_at on INSERT'
);

select ok(
  has_column_privilege('authenticated', 'public.people', 'username', 'UPDATE'),
  'authenticated may update username'
);
select ok(
  has_column_privilege('authenticated', 'public.people', 'display_name', 'UPDATE'),
  'authenticated may update display_name'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'profile_completed_at', 'UPDATE'),
  'authenticated cannot update profile_completed_at'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'id', 'UPDATE'),
  'authenticated cannot update id'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'status', 'UPDATE'),
  'authenticated cannot update status'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'created_at', 'UPDATE'),
  'authenticated cannot update created_at'
);
select ok(
  not has_column_privilege('authenticated', 'public.people', 'updated_at', 'UPDATE'),
  'authenticated cannot update updated_at'
);

select ok(has_table_privilege('service_role', 'public.people', 'SELECT'), 'service_role has SELECT');
select ok(has_table_privilege('service_role', 'public.people', 'INSERT'), 'service_role has INSERT');
select ok(has_table_privilege('service_role', 'public.people', 'UPDATE'), 'service_role has UPDATE');
select ok(has_table_privilege('service_role', 'public.people', 'DELETE'), 'service_role has DELETE');

select has_trigger(
  'public',
  'people',
  'people_set_updated_at',
  'updated_at trigger exists'
);

select ok(
  not (select prosecdef from pg_proc where oid = 'public.set_updated_at()'::regprocedure),
  'updated_at trigger function is security invoker'
);

select ok(
  not has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.set_updated_at()', 'EXECUTE'),
  'Data API roles cannot execute the trigger function directly'
);

select * from finish();
rollback;
