begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

insert into auth.users (id, email)
select
  ('10000000-0000-0000-0000-' || lpad(value::text, 12, '0'))::uuid,
  'constraint-' || value || '@example.test'
from generate_series(1, 20) as value;

select lives_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000001', 'ulas', 'Ulas')$$,
  'lowercase username is valid'
);

select lives_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000002', 'ulas_1', 'Ulas One')$$,
  'underscore and digit username is valid'
);

select lives_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000003', 'u123', 'U 123')$$,
  'letter and digits username is valid'
);

select lives_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000004', 'abc', 'Minimum')$$,
  'three-character username boundary is valid'
);

select lives_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000005', repeat('a', 30), 'Maximum')$$,
  'thirty-character username boundary is valid'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000006', 'UlAs', 'Uppercase')$$,
  '23514',
  null,
  'uppercase username is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000007', 'ab', 'Too Short')$$,
  '23514',
  null,
  'two-character username is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000008', repeat('a', 31), 'Too Long')$$,
  '23514',
  null,
  'thirty-one-character username is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000009', 'username-with-dash', 'Dash')$$,
  '23514',
  null,
  'dash username is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000010', 'name space', 'Space')$$,
  '23514',
  null,
  'space username is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000011', '@ulas', 'At Sign')$$,
  '23514',
  null,
  'at-sign username is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000012', 'ulas', 'Duplicate')$$,
  '23505',
  null,
  'duplicate username is rejected'
);

select throws_ok(
  $$insert into public.people (id, username)
    values ('10000000-0000-0000-0000-000000000013', 'missing_name')$$,
  '23502',
  null,
  'missing display name is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000014', 'long_name', repeat('d', 81))$$,
  '23514',
  null,
  'overlong display name is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name, headline)
    values (
      '10000000-0000-0000-0000-000000000016',
      'long_headline',
      'Long Headline',
      repeat('h', 121)
    )$$,
  '23514',
  null,
  'overlong headline is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name, bio)
    values (
      '10000000-0000-0000-0000-000000000017',
      'long_bio',
      'Long Bio',
      repeat('b', 501)
    )$$,
  '23514',
  null,
  'overlong bio is rejected'
);

select throws_ok(
  $$insert into public.people (id, username, display_name)
    values ('10000000-0000-0000-0000-000000000018', 'empty_name', '')$$,
  '23514',
  null,
  'empty display name is rejected'
);

insert into public.people (id, username, display_name)
values ('10000000-0000-0000-0000-000000000015', 'retained_person', 'Retained Person');

select throws_ok(
  $$delete from auth.users where id = '10000000-0000-0000-0000-000000000015'$$,
  '23503',
  null,
  'auth identity deletion cannot silently erase a Person'
);

select * from finish();
rollback;
