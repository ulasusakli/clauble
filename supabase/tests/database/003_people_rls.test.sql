begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(29);

insert into auth.users (id, email)
values
  ('20000000-0000-0000-0000-000000000001', 'user-a@example.test'),
  ('20000000-0000-0000-0000-000000000002', 'user-b@example.test'),
  ('20000000-0000-0000-0000-000000000003', 'user-c@example.test'),
  ('20000000-0000-0000-0000-000000000004', 'suspended@example.test'),
  ('20000000-0000-0000-0000-000000000005', 'deactivated@example.test'),
  ('20000000-0000-0000-0000-000000000006', 'deleted@example.test'),
  ('20000000-0000-0000-0000-000000000007', 'other-target@example.test'),
  ('20000000-0000-0000-0000-000000000008', 'controlled-columns@example.test');

insert into public.people (id, username, display_name, status, updated_at)
values
  ('20000000-0000-0000-0000-000000000001', 'user_a', 'User A', 'active', '2000-01-01'),
  ('20000000-0000-0000-0000-000000000002', 'user_b', 'User B', 'active', '2000-01-01'),
  ('20000000-0000-0000-0000-000000000004', 'suspended_user', 'Suspended', 'suspended', '2000-01-01'),
  ('20000000-0000-0000-0000-000000000005', 'deactivated_user', 'Deactivated', 'deactivated', '2000-01-01'),
  ('20000000-0000-0000-0000-000000000006', 'deleted_user', 'Deleted', 'deleted', '2000-01-01');

set local role anon;

select results_eq(
  $$select username from public.people order by username$$,
  $$values ('user_a'::text), ('user_b'::text)$$,
  'anon sees active People only'
);

select is(
  (select count(*)::integer from public.people where username = 'suspended_user'),
  0,
  'anon cannot see suspended People'
);
select is(
  (select count(*)::integer from public.people where username = 'deactivated_user'),
  0,
  'anon cannot see deactivated People'
);
select is(
  (select count(*)::integer from public.people where username = 'deleted_user'),
  0,
  'anon cannot see deleted People'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('20000000-0000-0000-0000-000000000003', 'anon_insert', 'Anon')$$,
  '42501',
  null,
  'anon cannot insert a Person'
);
select throws_ok(
  $$update public.people set display_name = 'Anon Update'
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'anon cannot update a Person'
);
select throws_ok(
  $$delete from public.people where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'anon cannot delete a Person'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.people where id = '20000000-0000-0000-0000-000000000002'),
  1,
  'user A can read active user B'
);
select is(
  (select count(*)::integer from public.people where id = '20000000-0000-0000-0000-000000000001'),
  1,
  'user A can read their own Person'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('20000000-0000-0000-0000-000000000007', 'wrong_owner', 'Wrong Owner')$$,
  '42501',
  null,
  'user A cannot create a Person for another Auth identity'
);

select is_empty(
  $$update public.people
    set display_name = 'Changed by A'
    where id = '20000000-0000-0000-0000-000000000002'
    returning id$$,
  'user A cannot update user B'
);

select lives_ok(
  $$update public.people
    set display_name = 'User A Updated'
    where id = '20000000-0000-0000-0000-000000000001'$$,
  'user A can update a safe field on their own Person'
);
select is(
  (select display_name from public.people where id = '20000000-0000-0000-0000-000000000001'),
  'User A Updated',
  'safe own-profile update persists'
);
select ok(
  (select updated_at > '2000-01-01'::timestamptz from public.people
    where id = '20000000-0000-0000-0000-000000000001'),
  'safe profile update advances updated_at'
);

select throws_ok(
  $$delete from public.people where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'user A cannot delete their own Person'
);
select throws_ok(
  $$delete from public.people where id = '20000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'user A cannot delete user B'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.people (
      id, username, display_name, headline, bio, avatar_path, website_url
    ) values (
      '20000000-0000-0000-0000-000000000003',
      'user_c',
      'User C',
      'Headline',
      'Bio',
      '20000000-0000-0000-0000-000000000003/30000000-0000-4000-8000-000000000003.png',
      'https://example.test'
    )$$,
  'user C can create exactly their own Person with safe columns'
);
select ok(
  (select profile_completed_at is not null from public.people
    where id = '20000000-0000-0000-0000-000000000003'),
  'database sets profile_completed_at for authenticated insert'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.people where id = '20000000-0000-0000-0000-000000000004'),
  1,
  'suspended user can read their own Person'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.people where id = '20000000-0000-0000-0000-000000000004'),
  0,
  'another authenticated user cannot read a suspended Person'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000008","role":"authenticated"}',
  true
);

select throws_ok(
  $$insert into public.people (id, username, display_name, status)
    values (
      '20000000-0000-0000-0000-000000000008',
      'controlled_user',
      'Controlled User',
      'suspended'
    )$$,
  '42501',
  null,
  'authenticated user cannot choose lifecycle status during creation'
);
select throws_ok(
  $$insert into public.people (id, username, display_name, created_at)
    values (
      '20000000-0000-0000-0000-000000000008',
      'controlled_user',
      'Controlled User',
      '2000-01-01'
    )$$,
  '42501',
  null,
  'authenticated user cannot choose created_at during creation'
);
select throws_ok(
  $$insert into public.people (id, username, display_name, updated_at)
    values (
      '20000000-0000-0000-0000-000000000008',
      'controlled_user',
      'Controlled User',
      '2000-01-01'
    )$$,
  '42501',
  null,
  'authenticated user cannot choose updated_at during creation'
);
select throws_ok(
  $$insert into public.people (id, username, display_name, profile_completed_at)
    values (
      '20000000-0000-0000-0000-000000000008',
      'controlled_user',
      'Controlled User',
      '2000-01-01'
    )$$,
  '42501',
  null,
  'authenticated user cannot choose profile_completed_at during creation'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.people
    set id = '20000000-0000-0000-0000-000000000007'
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated user cannot alter id'
);
select throws_ok(
  $$update public.people set status = 'suspended'
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated user cannot alter status'
);
select throws_ok(
  $$update public.people set created_at = now()
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated user cannot alter created_at'
);
select throws_ok(
  $$update public.people set updated_at = now()
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated user cannot alter updated_at directly'
);
select throws_ok(
  $$update public.people set profile_completed_at = now()
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated user cannot alter profile_completed_at'
);

select * from finish();
rollback;
