-- ---------------------------------------------------------------------------
-- SolveSamaj — profiles_phone_key duplicate-key fix
-- ---------------------------------------------------------------------------
-- Symptom: saving a profile (org or citizen) failed with
--   "duplicate key value violates unique constraint profiles_phone_key"
--
-- Two causes, both addressed (1 here in SQL, 2 in the pages):
--   1. Blank phones were stored as '' — a UNIQUE constraint allows many
--      NULLs but only ONE ''. So the second account ever saved with a blank
--      phone hit the violation. The pages now write NULL instead of ''
--      (multiple NULLs never conflict).
--   2. A real phone number typed into the form already belonged to a
--      different account. The pages now detect this (Postgres 23505) and
--      save the rest of the profile with a clear message instead of the
--      raw database error.
--
-- The unique constraint itself is a leftover from the removed phone-login
-- era (phone is now optional contact info only). Run this once in the
-- Supabase SQL Editor.
-- ---------------------------------------------------------------------------

-- 1) One-time cleanup: any existing blank/whitespace phones become NULL so
--    they can never collide again (also required if you keep the constraint).
update public.profiles
   set phone = null
 where trim(coalesce(phone, '')) = '';

-- 2) RECOMMENDED — drop the leftover unique constraint. Phone sign-in has
--    been removed from the app, so nothing needs 1-phone-1-account anymore,
--    and this alone immediately unblocks every save (old pages included).
alter table public.profiles
  drop constraint if exists profiles_phone_key;

--    ALTERNATIVE — if you would rather KEEP one-phone-one-account, do NOT run
--    step 2 (or re-add it); the updated pages will show a friendly message
--    instead of the raw error when a number is already taken:
-- alter table public.profiles
--   add constraint profiles_phone_key unique (phone);

-- ---------------------------------------------------------------------------
-- 3) Verify
-- ---------------------------------------------------------------------------
-- a) constraint is gone (no row with conname = 'profiles_phone_key'):
select conname
  from pg_constraint
 where conrelid = 'public.profiles'::regclass
   and contype = 'u';

-- b) no blank-phone rows remain:
select count(*) as blank_phone_rows
  from public.profiles
 where coalesce(phone, '') = '';

-- c) (only if you kept the constraint) see which numbers would collide:
-- select phone, count(*) from public.profiles where phone is not null group by phone having count(*) > 1;