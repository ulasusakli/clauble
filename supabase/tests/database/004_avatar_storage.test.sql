begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

select ok(exists(select 1 from storage.buckets where id = 'avatars'), 'avatars bucket exists');
select ok((select public from storage.buckets where id = 'avatars'), 'avatars bucket is public');
select is(
  (select file_size_limit from storage.buckets where id = 'avatars'),
  1048576::bigint,
  'avatars bucket has a one MiB limit'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'avatars'),
  array['image/jpeg', 'image/png', 'image/webp']::text[],
  'avatars bucket permits only JPEG, PNG, and WebP'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'storage.objects has RLS enabled'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'avatars_%'),
  3,
  'avatars has exactly three object policies'
);
select is(
  (
    select array_agg(policyname order by policyname)
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'avatars_%'
  ),
  array['avatars_delete_own', 'avatars_insert_own', 'avatars_select_own']::name[],
  'avatars exposes only owner select, insert, and delete policies'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_update_own'),
  0,
  'avatar replacement does not use object UPDATE or upsert'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.people'::regclass
      and conname = 'people_avatar_path_format_check'
      and contype = 'c'
  ),
  'people avatar_path has a canonical owner-path constraint'
);

insert into auth.users (id, email)
values
  ('40000000-0000-4000-8000-000000000001', 'avatar-a@example.test'),
  ('40000000-0000-4000-8000-000000000002', 'avatar-b@example.test');

insert into public.people (id, username, display_name)
values
  ('40000000-0000-4000-8000-000000000001', 'avatar_user_a', 'Avatar A'),
  ('40000000-0000-4000-8000-000000000002', 'avatar_user_b', 'Avatar B');

-- Storage API delete requests set this transaction-local guard before deleting metadata.
set local storage.allow_delete_query = 'true';

select lives_ok(
  $$update public.people set avatar_path = '40000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001.webp'
    where id = '40000000-0000-4000-8000-000000000001'$$,
  'canonical avatar path is accepted'
);
select throws_ok(
  $$update public.people set avatar_path = '40000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000001.webp'
    where id = '40000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'another user folder is rejected by people'
);
select throws_ok(
  $$update public.people set avatar_path = '40000000-0000-4000-8000-000000000001/avatar.gif'
    where id = '40000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'noncanonical avatar name is rejected by people'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '40000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000001.png', '40000000-0000-4000-8000-000000000001')$$,
  'owner may insert a canonical object in their folder'
);
select is(
  (select owner_id from storage.objects where name = '40000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000001.png'),
  '40000000-0000-4000-8000-000000000001',
  'owner_id is retained on the owned object'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '40000000-0000-4000-8000-000000000002/60000000-0000-4000-8000-000000000002.png', '40000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'owner cannot insert in another user folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '40000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000003.png', '40000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'owner cannot forge owner_id'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '40000000-0000-4000-8000-000000000001/avatar.png', '40000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'owner cannot insert a noncanonical object name'
);
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'avatars'),
  1,
  'owner can list their own avatar object only'
);

select set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'avatars'),
  0,
  'another user cannot list the owner object'
);
select is_empty(
  $$delete from storage.objects where bucket_id = 'avatars' returning name$$,
  'another user cannot delete the owner object'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '40000000-0000-4000-8000-000000000002/60000000-0000-4000-8000-000000000004.jpg', '40000000-0000-4000-8000-000000000002')$$,
  'second owner may insert in their folder'
);
select is_empty(
  $$update storage.objects set name = '40000000-0000-4000-8000-000000000002/60000000-0000-4000-8000-000000000005.jpg'
    where bucket_id = 'avatars' returning name$$,
  'object UPDATE is denied because replacement uses a new upload'
);
select lives_ok(
  $$delete from storage.objects where bucket_id = 'avatars' and owner_id = '40000000-0000-4000-8000-000000000002'$$,
  'owner may delete their own object'
);

reset role;
set local role anon;
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'avatars'),
  0,
  'anon cannot list avatar metadata'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '40000000-0000-4000-8000-000000000002/60000000-0000-4000-8000-000000000006.jpg', null)$$,
  '42501', null, 'anon cannot upload an avatar'
);
select is_empty(
  $$delete from storage.objects where bucket_id = 'avatars' returning name$$,
  'anon cannot delete avatar objects'
);

reset role;
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'avatars'),
  1,
  'owner A object remains after unauthorized operations'
);
select lives_ok(
  $$delete from storage.objects where bucket_id = 'avatars'$$,
  'test cleanup can remove storage metadata as postgres'
);

select * from finish();
rollback;
