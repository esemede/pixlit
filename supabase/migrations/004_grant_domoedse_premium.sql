-- One-off entitlement grant requested by product/admin.
-- Keeps the existing profile/auth user intact and only upgrades the Pixlit plan.
update public.profiles
set
  plan = 'starter',
  sub_status = 'active',
  sub_provider = null,
  sub_provider_sub_id = null,
  sub_current_period_end = null,
  updated_at = now()
where lower(email) = 'domoedse@gmail.com';
