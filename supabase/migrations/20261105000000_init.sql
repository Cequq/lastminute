-- =====================================================================
-- LastMinute — хаах дөхсөн цаг, эрэлт багатай үеийн хямдралын платформ
-- Өгөгдлийн сан: 11 хүснэгт, RLS, функц, Storage, Realtime
-- Хэрэглэгчийн төрөл: зочин, хэрэглэгч (user), байгууллага (business), админ (admin)
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. ХҮСНЭГТҮҮД
-- =====================================================================

-- 1) Профайл (auth.users-тэй 1:1)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'user' check (role in ('user', 'business', 'admin')),
  created_at  timestamptz not null default now()
);

-- 2) Ангилал
create table public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  slug        text not null unique,
  icon        text not null default 'Tag',      -- lucide icon нэр
  color       text not null default '#12756e',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 3) Байгууллага (ангилал 1:N байгууллага, хамтрагч хэрэглэгч 1:N байгууллага)
create table public.businesses (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.profiles(id) on delete set null,  -- хамтрагч (business) хэрэглэгч
  category_id  bigint not null references public.categories(id) on delete restrict,
  name         text not null check (char_length(name) between 2 and 80),
  description  text,
  district     text not null,
  address      text,
  phone        text,
  lat          double precision check (lat between -90 and 90),
  lng          double precision check (lng between -180 and 180),
  opens_at     time not null default '10:00',
  closes_at    time not null default '22:00',   -- opens_at-аас бага бол шөнө дундаас хойш хаадаг
  -- Цаг бүрийн дундаж ачаалал 0-100 (24 утга). «Ихэвчлэн хэр завгүй вэ» графикт.
  busy_profile int[] not null default array_fill(40, array[24])
               check (array_length(busy_profile, 1) = 24),
  logo_url     text,
  cover_url    text,
  is_active    boolean not null default true,
  is_demo      boolean not null default false,  -- жишээ өгөгдөл: байгууллага бодит, хямдрал нь жишээ
  created_at   timestamptz not null default now()
);
create index on public.businesses (category_id);
create index on public.businesses (owner_id);

-- 4) Эрэлт багатай / хаах дөхсөн цаг — долоо хоног бүр давтагдах хямдралын цонх
create table public.quiet_hours (
  id           bigint generated always as identity primary key,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),   -- 0 = Ням ... 6 = Бямба
  start_time   time not null,
  end_time     time not null,
  discount     int  not null check (discount between 5 and 90),
  kind         text not null default 'off_peak' check (kind in ('off_peak', 'closing')),
  created_at   timestamptz not null default now(),
  check (end_time > start_time)
);
create index on public.quiet_hours (business_id, weekday);

-- 5) Хямдралтай цаг/суудал (байгууллага 1:N)
create table public.deals (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  deal_type          text not null default 'last_minute'
                     check (deal_type in ('closing', 'off_peak', 'last_minute')),
  title              text not null check (char_length(title) between 3 and 120),
  description        text,
  image_url          text,
  starts_at          timestamptz not null,
  duration_minutes   int  not null default 60 check (duration_minutes between 5 and 1440),
  original_price     int  not null check (original_price >= 100),
  start_discount     int  not null default 10 check (start_discount between 0 and 90),
  max_discount       int  not null default 50 check (max_discount between 0 and 90),
  drop_window_hours  int  not null default 24 check (drop_window_hours between 1 and 168),
  quantity           int  not null default 1 check (quantity between 1 and 500),
  terms              text check (char_length(terms) <= 500),          -- хэрэглэх нөхцөл
  -- Үнэгүй цуцлах хугацаа: эхлэхээс N цагийн өмнө хүртэл цуцалбал 100% буцаана. 0 = буцаалтгүй.
  cancel_hours       int  not null default 2 check (cancel_hours between 0 and 72),
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  check (max_discount >= start_discount)
);
create index on public.deals (business_id);
create index on public.deals (starts_at);

-- 6) Захиалга (хэрэглэгч ↔ deal: N:M)
create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  deal_id        uuid not null references public.deals(id) on delete restrict,
  quantity       int  not null default 1 check (quantity between 1 and 10),
  unit_price     int  not null,
  total_amount   int  not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'paid', 'cancelled', 'expired', 'refund_requested', 'refunded')),
  expires_at     timestamptz not null default now() + interval '15 minutes',
  paid_at        timestamptz,
  checked_in_at  timestamptz,           -- байгууллага дээр тасалбар шалгасан цаг
  cancel_reason  text check (char_length(cancel_reason) <= 300),
  cancelled_at   timestamptz,
  refunded_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index on public.bookings (user_id);
create index on public.bookings (deal_id);
create index on public.bookings (status);

-- 7) Төлбөр (захиалга 1:N)
create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings(id) on delete cascade,
  provider         text not null default 'qpay',
  invoice_id       text,
  qr_text          text,
  qr_image         text,
  short_url        text,
  bank_urls        jsonb,
  amount           int  not null,
  status           text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  callback_token   text not null default encode(gen_random_bytes(24), 'hex'),
  qpay_payment_id  text,
  raw              jsonb,
  paid_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index on public.payments (booking_id);

-- 8) Дуртай (хэрэглэгч ↔ deal: N:M)
create table public.favorites (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  deal_id     uuid not null references public.deals(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, deal_id)
);

-- 9) Үнэлгээ (төлөгдсөн захиалга бүрт 1)
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  booking_id   uuid not null unique references public.bookings(id) on delete cascade,
  rating       int  not null check (rating between 1 and 5),
  comment      text check (char_length(comment) <= 500),
  author_name  text,   -- бусдын профайлыг RLS-ээр уншиж болохгүй тул бичих үед хадгална
  created_at   timestamptz not null default now()
);
create index on public.reviews (business_id);

-- 10) Хамтрагч болох хүсэлт — байгууллага платформд нэгдэх
create table public.partner_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  business_name  text not null check (char_length(business_name) between 2 and 80),
  category_id    bigint not null references public.categories(id),
  district       text not null,
  address        text,
  phone          text not null,
  message        text check (char_length(message) <= 500),
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note     text,
  business_id    uuid references public.businesses(id) on delete set null,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz
);
-- Нэг хэрэглэгч нэг л хүлээгдэж буй хүсэлттэй байна
create unique index partner_requests_one_pending on public.partner_requests (user_id) where status = 'pending';

-- 11) Мэдэгдэл (зөвхөн trigger/функц үүсгэнэ)
create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- =====================================================================
-- 2. ЭРХИЙН ТУСЛАХ ФУНКЦУУД
--    security definer → RLS-ийг тойрч уншдаг тул policy дотор давталт үүсэхгүй
-- =====================================================================

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

-- Админ эсвэл тухайн байгууллагын эзэн
create or replace function public.can_manage_business(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.businesses where id = p_business_id and owner_id = auth.uid()
  );
$$;

create or replace function public.can_manage_deal(p_deal_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.deals d where d.id = p_deal_id and public.can_manage_business(d.business_id));
$$;

-- Тухайн хэрэглэгч миний байгууллагад захиалга өгсөн эсэх (хамтрагч үйлчлүүлэгчийн нэрийг харах)
create or replace function public.is_my_customer(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    join public.deals d on d.id = b.deal_id
    join public.businesses bs on bs.id = d.business_id
    where b.user_id = p_user_id and bs.owner_id = auth.uid()
  );
$$;

-- Шинэ хэрэглэгч бүртгүүлэхэд профайл үүсгэнэ
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Энгийн хэрэглэгч өөрийн эрхийг өөрчлөхөөс хамгаална.
-- SQL Editor/service_role-д auth.uid() null тул эхний админыг SQL-ээр тохируулж болно.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Эрхээ өөрөө өөрчлөх боломжгүй';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- =====================================================================
-- 3. ҮНЭ, ЦАГИЙН ФУНКЦУУД
-- =====================================================================

-- Улаанбаатарын одоогийн цаг (сервер UTC-ээр ажилладаг)
create or replace function public.ub_now()
returns timestamp language sql stable
as $$ select now() at time zone 'Asia/Ulaanbaatar'; $$;

-- Тухайн мөчид deal-ийн хямдралын хувь (src/lib/pricing.js-тэй ижил томьёо)
create or replace function public.deal_discount_at(d public.deals, at timestamptz)
returns numeric language sql stable
as $$
  select case
    when at >= d.starts_at then d.max_discount
    when at <= d.starts_at - make_interval(hours => d.drop_window_hours) then d.start_discount
    else d.start_discount + (d.max_discount - d.start_discount) *
         (extract(epoch from at - (d.starts_at - make_interval(hours => d.drop_window_hours)))
          / (d.drop_window_hours * 3600.0))
  end;
$$;

create or replace function public.deal_price_at(d public.deals, at timestamptz)
returns int language sql stable
as $$
  select greatest(100, (round(d.original_price * (100 - public.deal_discount_at(d, at)) / 100.0 / 100.0) * 100)::int);
$$;

create or replace function public.deal_seats_left(p_deal_id uuid)
returns int language sql stable security definer set search_path = public
as $$
  select d.quantity - coalesce((
    select sum(b.quantity)::int from public.bookings b
    where b.deal_id = d.id
      and (b.status = 'paid' or (b.status = 'pending' and b.expires_at > now()))
  ), 0)
  from public.deals d where d.id = p_deal_id;
$$;

-- Яг одоо идэвхтэй эрэлт багатай, хаах дөхсөн цагийн хамгийн их хямдрал (байхгүй бол null)
create or replace function public.quiet_discount_now(p_business_id uuid)
returns int language sql stable
as $$
  select max(q.discount) from public.quiet_hours q
  where q.business_id = p_business_id
    and q.weekday = extract(dow from public.ub_now())::int
    and public.ub_now()::time between q.start_time and q.end_time;
$$;

-- =====================================================================
-- 4. ХАЙЛТАД ЗОРИУЛСАН VIEW (security_invoker → RLS хэрэгжинэ)
-- =====================================================================
create or replace view public.deal_listings
with (security_invoker = true)
as
select
  d.*,
  b.name        as business_name,
  b.district    as district,
  b.address     as address,
  b.lat         as lat,
  b.lng         as lng,
  b.cover_url   as business_cover,
  b.is_demo     as business_is_demo,
  c.id          as category_id,
  c.name        as category_name,
  c.slug        as category_slug,
  c.icon        as category_icon,
  c.color       as category_color,
  public.deal_price_at(d, now())                    as current_price,
  round(public.deal_discount_at(d, now()))::int     as current_discount,
  d.original_price - public.deal_price_at(d, now()) as saving,
  public.deal_seats_left(d.id)                      as seats_left,
  (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.business_id = b.id) as avg_rating,
  (select count(*) from public.reviews r where r.business_id = b.id)::int                   as review_count
from public.deals d
join public.businesses b on b.id = d.business_id
join public.categories c on c.id = b.category_id;

create or replace view public.business_listings
with (security_invoker = true)
as
select
  b.*,
  c.name  as category_name,
  c.slug  as category_slug,
  c.icon  as category_icon,
  c.color as category_color,
  (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.business_id = b.id) as avg_rating,
  (select count(*) from public.reviews r where r.business_id = b.id)::int as review_count,
  (select count(*) from public.deals d where d.business_id = b.id and d.is_active and d.starts_at > now())::int as active_deals,
  public.quiet_discount_now(b.id) as quiet_discount_now
from public.businesses b
join public.categories c on c.id = b.category_id;

grant select on public.deal_listings, public.business_listings to anon, authenticated;

-- =====================================================================
-- 5. ЗАХИАЛГА, ТӨЛБӨР, ШАЛГАЛТ
-- =====================================================================

-- Захиалга үүсгэх. Үнийг сервер тооцно. "for update" нь зэрэг захиалгаас хамгаална.
create or replace function public.create_pending_booking(p_deal_id uuid, p_quantity int default 1)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_deal    public.deals;
  v_left    int;
  v_price   int;
  v_booking public.bookings;
begin
  if auth.uid() is null then raise exception 'Нэвтэрнэ үү'; end if;
  if p_quantity < 1 or p_quantity > 10 then raise exception 'Тоо ширхэг 1-10 хооронд байна'; end if;

  select * into v_deal from public.deals where id = p_deal_id for update;
  if not found or not v_deal.is_active then raise exception 'Хямдрал олдсонгүй'; end if;
  if v_deal.starts_at <= now() then raise exception 'Энэ цаг аль хэдийн эхэлсэн байна'; end if;

  v_left := public.deal_seats_left(p_deal_id);
  if v_left < p_quantity then raise exception 'Үлдсэн суудал хүрэлцэхгүй (% үлдсэн)', v_left; end if;

  v_price := public.deal_price_at(v_deal, now());

  insert into public.bookings (user_id, deal_id, quantity, unit_price, total_amount)
  values (auth.uid(), p_deal_id, p_quantity, v_price, v_price * p_quantity)
  returning * into v_booking;
  return v_booking;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.bookings set status = 'cancelled'
   where id = p_booking_id and status = 'pending'
     and (user_id = auth.uid() or public.can_manage_deal(deal_id));
  if not found then raise exception 'Цуцлах боломжгүй захиалга'; end if;
end;
$$;

-- Төлбөр баталгаажуулах. Зөвхөн Edge Function (service_role) дуудна.
create or replace function public.confirm_payment(p_payment_id uuid, p_qpay_payment_id text, p_raw jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare v_booking_id uuid;
begin
  update public.payments
     set status = 'paid', paid_at = now(), qpay_payment_id = p_qpay_payment_id, raw = p_raw
   where id = p_payment_id and status <> 'paid'
  returning booking_id into v_booking_id;

  if v_booking_id is not null then
    update public.bookings set status = 'paid', paid_at = now()
     where id = v_booking_id and status in ('pending', 'expired');
  end if;
end;
$$;
revoke execute on function public.confirm_payment(uuid, text, jsonb) from public, anon, authenticated;

-- Тасалбарын 8 тэмдэгт кодоор захиалга хайх (байгууллага/админ)
create or replace function public.lookup_booking(p_code text)
returns json language plpgsql stable security definer set search_path = public
as $$
declare v json; v_business uuid;
begin
  select d.business_id,
         json_build_object(
           'id', b.id, 'status', b.status, 'quantity', b.quantity, 'total_amount', b.total_amount,
           'checked_in_at', b.checked_in_at, 'paid_at', b.paid_at,
           'deal_title', d.title, 'starts_at', d.starts_at, 'business_name', bs.name,
           'customer_name', p.full_name, 'customer_phone', p.phone)
    into v_business, v
  from public.bookings b
  join public.deals d on d.id = b.deal_id
  join public.businesses bs on bs.id = d.business_id
  left join public.profiles p on p.id = b.user_id
  where upper(left(replace(b.id::text, '-', ''), 8)) = upper(trim(p_code))
  limit 1;

  if v is null then raise exception 'Ийм кодтой захиалга олдсонгүй'; end if;
  if not public.can_manage_business(v_business) then raise exception 'Энэ захиалга танай байгууллагынх биш байна'; end if;
  return v;
end;
$$;

create or replace function public.check_in_booking(p_booking_id uuid)
returns timestamptz language plpgsql security definer set search_path = public
as $$
declare v public.bookings;
begin
  select * into v from public.bookings where id = p_booking_id for update;
  if not found or not public.can_manage_deal(v.deal_id) then raise exception 'Захиалга олдсонгүй'; end if;
  if v.status <> 'paid' then raise exception 'Төлбөр төлөгдөөгүй захиалга'; end if;
  if v.checked_in_at is not null then raise exception 'Энэ тасалбар аль хэдийн ашиглагдсан'; end if;
  update public.bookings set checked_in_at = now() where id = p_booking_id;
  return now();
end;
$$;

-- =====================================================================
-- 5б. ЦУЦЛАЛТ, БУЦААЛТ
--   Төлөгдсөн захиалгыг эхлэхээс deals.cancel_hours цагийн өмнө хүртэл цуцалбал
--   төлбөрийг 100% буцаана. Хэрэглэгч хүсэлт гаргаж, байгууллага/админ мөнгийг
--   QPay merchant портал эсвэл банкаар буцаагаад "Буцаасан" гэж баталгаажуулна.
-- =====================================================================
create or replace function public.request_refund(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare v public.bookings; d public.deals;
begin
  select * into v from public.bookings where id = p_booking_id and user_id = auth.uid() for update;
  if not found then raise exception 'Захиалга олдсонгүй'; end if;
  if v.status <> 'paid' then raise exception 'Зөвхөн төлөгдсөн захиалгыг буцаах боломжтой'; end if;
  if v.checked_in_at is not null then raise exception 'Ашигласан тасалбарыг буцаах боломжгүй'; end if;

  select * into d from public.deals where id = v.deal_id;
  if d.cancel_hours = 0 then raise exception 'Энэ хямдрал буцаалтгүй нөхцөлтэй'; end if;
  if now() > d.starts_at - make_interval(hours => d.cancel_hours) then
    raise exception 'Үнэгүй цуцлах хугацаа (эхлэхээс % цагийн өмнө) өнгөрсөн байна', d.cancel_hours;
  end if;

  update public.bookings
     set status = 'refund_requested', cancelled_at = now(), cancel_reason = nullif(trim(p_reason), '')
   where id = p_booking_id
  returning * into v;
  return v;
end;
$$;

create or replace function public.mark_refunded(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v public.bookings;
begin
  select * into v from public.bookings where id = p_booking_id for update;
  if not found or not public.can_manage_deal(v.deal_id) then raise exception 'Захиалга олдсонгүй'; end if;
  if v.status <> 'refund_requested' then raise exception 'Буцаалтын хүсэлтгүй захиалга'; end if;
  update public.bookings set status = 'refunded', refunded_at = now() where id = p_booking_id;
  update public.payments set status = 'refunded' where booking_id = p_booking_id and status = 'paid';
end;
$$;

-- =====================================================================
-- 6. ХАМТРАГЧ БОЛОХ ХҮСЭЛТ
-- =====================================================================
create or replace function public.approve_partner_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare r public.partner_requests; v_business uuid;
begin
  if not public.is_admin() then raise exception 'Зөвхөн админ'; end if;
  select * into r from public.partner_requests where id = p_request_id and status = 'pending' for update;
  if not found then raise exception 'Хүлээгдэж буй хүсэлт олдсонгүй'; end if;

  insert into public.businesses (owner_id, category_id, name, district, address, phone)
  values (r.user_id, r.category_id, r.business_name, r.district, r.address, r.phone)
  returning id into v_business;

  update public.profiles set role = 'business' where id = r.user_id and role = 'user';
  update public.partner_requests
     set status = 'approved', reviewed_at = now(), business_id = v_business
   where id = p_request_id;
  return v_business;
end;
$$;

create or replace function public.reject_partner_request(p_request_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Зөвхөн админ'; end if;
  update public.partner_requests
     set status = 'rejected', reviewed_at = now(), admin_note = nullif(trim(p_note), '')
   where id = p_request_id and status = 'pending';
  if not found then raise exception 'Хүлээгдэж буй хүсэлт олдсонгүй'; end if;
end;
$$;

-- =====================================================================
-- 7. МЭДЭГДЭЛ (trigger-ээр автоматаар үүснэ)
-- =====================================================================
create or replace function public.notify_booking_paid()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_title text; v_owner uuid;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select d.title, bs.owner_id into v_title, v_owner
      from public.deals d join public.businesses bs on bs.id = d.business_id where d.id = new.deal_id;

    insert into public.notifications (user_id, title, body, link)
    values (new.user_id, 'Захиалга баталгаажлаа', v_title, '/checkout/' || new.id);

    if v_owner is not null then
      insert into public.notifications (user_id, title, body, link)
      values (v_owner, 'Шинэ захиалга орлоо', v_title || ' · ' || new.quantity || ' ширхэг', '/partner/bookings');
    end if;
  end if;

  if new.status = 'refund_requested' and old.status = 'paid' then
    select d.title, bs.owner_id into v_title, v_owner
      from public.deals d join public.businesses bs on bs.id = d.business_id where d.id = new.deal_id;
    insert into public.notifications (user_id, title, body, link)
    values (new.user_id, 'Буцаалтын хүсэлт илгээгдлээ', v_title || '. Төлбөрийг 1-3 ажлын өдөрт буцаана.', '/account/bookings');
    if v_owner is not null then
      insert into public.notifications (user_id, title, body, link)
      values (v_owner, 'Буцаалтын хүсэлт ирлээ', v_title || ' · ' || new.total_amount || '₮', '/partner/bookings');
    end if;
  end if;

  if new.status = 'refunded' and old.status = 'refund_requested' then
    select d.title into v_title from public.deals d where d.id = new.deal_id;
    insert into public.notifications (user_id, title, body, link)
    values (new.user_id, 'Төлбөр буцаагдлаа', v_title || ' · ' || new.total_amount || '₮', '/account/bookings');
  end if;
  return new;
end;
$$;

create trigger bookings_notify_paid
  after update of status on public.bookings
  for each row execute function public.notify_booking_paid();

create or replace function public.notify_partner_request()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status <> old.status then
    insert into public.notifications (user_id, title, body, link)
    values (
      new.user_id,
      case new.status when 'approved' then 'Хамтран ажиллах хүсэлт зөвшөөрөгдлөө' else 'Хамтран ажиллах хүсэлт татгалзагдлаа' end,
      case new.status when 'approved' then new.business_name || ' байгууллагаа удирдах боломжтой боллоо.'
                      else coalesce(new.admin_note, 'Дэлгэрэнгүйг админаас лавлана уу.') end,
      case new.status when 'approved' then '/partner' else '/partner/apply' end
    );
  end if;
  return new;
end;
$$;

create trigger partner_requests_notify
  after update of status on public.partner_requests
  for each row execute function public.notify_partner_request();

-- =====================================================================
-- 8. СТАТИСТИК
--    p_business_id = null → бүх платформ (админ), утгатай → тухайн байгууллага (эзэн/админ)
-- =====================================================================
create or replace function public.dashboard_stats(p_business_id uuid default null, p_days int default 14)
returns json
language plpgsql stable security definer
set search_path = public
set timezone = 'Asia/Ulaanbaatar'
as $$
declare result json;
begin
  if p_business_id is null and not public.is_admin() then raise exception 'Зөвхөн админ'; end if;
  if p_business_id is not null and not public.can_manage_business(p_business_id) then raise exception 'Эрх хүрэхгүй'; end if;

  with scoped as (
    select b.*, d.original_price, d.title, d.starts_at, d.deal_type, bs.id as bid, bs.name as bname, bs.category_id
    from bookings b
    join deals d on d.id = b.deal_id
    join businesses bs on bs.id = d.business_id
    where p_business_id is null or bs.id = p_business_id
  )
  select json_build_object(
    'total_revenue',  (select coalesce(sum(total_amount), 0) from scoped where status = 'paid'),
    'total_saved',    (select coalesce(sum((original_price - unit_price) * quantity), 0) from scoped where status = 'paid'),
    'paid_bookings',  (select count(*) from scoped where status = 'paid'),
    'total_bookings', (select count(*) from scoped),
    'checked_in',     (select count(*) from scoped where checked_in_at is not null),
    'active_deals',   (select count(*) from deals where is_active and starts_at > now()
                         and (p_business_id is null or business_id = p_business_id)),
    'total_users',    case when p_business_id is null then (select count(*) from profiles) end,
    'new_users_7d',   case when p_business_id is null then (select count(*) from profiles where created_at > now() - interval '7 days') end,
    'businesses',     case when p_business_id is null then (select count(*) from businesses) end,
    'pending_partners', case when p_business_id is null then (select count(*) from partner_requests where status = 'pending') end,
    'daily', (
      select json_agg(row_to_json(t) order by t.day) from (
        select to_char(gs::date, 'MM-DD') as day,
               coalesce(sum(s.total_amount) filter (where s.status = 'paid'), 0) as revenue,
               count(s.id) filter (where s.status = 'paid') as orders
        from generate_series((current_date - (p_days - 1))::timestamp, current_date::timestamp, interval '1 day') gs
        left join scoped s on s.created_at::date = gs::date
        group by gs
      ) t
    ),
    'by_status', (select json_agg(row_to_json(t)) from (select status, count(*) as count from scoped group by status) t),
    'by_type', (
      select json_agg(row_to_json(t)) from (
        select deal_type, coalesce(sum(total_amount), 0) as revenue, count(*) as orders
        from scoped where status = 'paid' group by deal_type
      ) t
    ),
    'by_hour', (
      select json_agg(row_to_json(t) order by t.hour) from (
        select extract(hour from starts_at)::int as hour, count(*) as orders
        from scoped where status = 'paid' group by 1
      ) t
    ),
    'by_category', case when p_business_id is null then (
      select json_agg(row_to_json(t) order by t.revenue desc) from (
        select c.name, c.color, coalesce(sum(s.total_amount) filter (where s.status = 'paid'), 0) as revenue
        from categories c left join scoped s on s.category_id = c.id
        group by c.id
      ) t
    ) end,
    'top', (
      select json_agg(row_to_json(t)) from (
        select case when p_business_id is null then bname else title end as name,
               sum(total_amount) as revenue, count(*) as orders
        from scoped where status = 'paid'
        group by 1 order by revenue desc limit 5
      ) t
    )
  ) into result;
  return result;
end;
$$;

-- Демо өгөгдлийн өнгөрсөн цагуудыг өдрөөр урагшлуулна (өдрийн цаг нь хэвээр)
create or replace function public.refresh_demo_deals()
returns int language plpgsql security definer set search_path = public
as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Зөвхөн админ'; end if;
  update public.deals
     set starts_at = starts_at + make_interval(days => ceil(extract(epoch from (now() + interval '30 minutes' - starts_at)) / 86400)::int)
   where starts_at < now() + interval '30 minutes';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- =====================================================================
-- 9. ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.businesses       enable row level security;
alter table public.quiet_hours      enable row level security;
alter table public.deals            enable row level security;
alter table public.bookings         enable row level security;
alter table public.payments         enable row level security;
alter table public.favorites        enable row level security;
alter table public.reviews          enable row level security;
alter table public.partner_requests enable row level security;
alter table public.notifications    enable row level security;

-- profiles
create policy "profiles: read own, admin, or my customers" on public.profiles
  for select using (id = auth.uid() or public.is_admin() or public.is_my_customer(id));
create policy "profiles: own update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles
  for update using (public.is_admin());

-- categories: хэн ч уншина, админ бичнэ
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- businesses: идэвхтэйг хэн ч; эзэн өөрийнхөө мэдээллийг засна; үүсгэх/устгах зөвхөн админ
create policy "businesses: read" on public.businesses
  for select using (is_active or public.can_manage_business(id));
create policy "businesses: admin insert" on public.businesses
  for insert with check (public.is_admin());
create policy "businesses: owner or admin update" on public.businesses
  for update using (public.can_manage_business(id))
  with check (public.is_admin() or owner_id = auth.uid());
create policy "businesses: admin delete" on public.businesses
  for delete using (public.is_admin());

-- quiet_hours: хэн ч уншина; эзэн/админ бичнэ
create policy "quiet_hours: public read" on public.quiet_hours for select using (true);
create policy "quiet_hours: manage" on public.quiet_hours
  for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- deals: идэвхтэйг хэн ч; эзэн/админ бичнэ
create policy "deals: read" on public.deals
  for select using (is_active or public.can_manage_business(business_id));
create policy "deals: manage" on public.deals
  for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- bookings: өөрийнхөө, эсвэл өөрийн байгууллагын. INSERT зөвхөн create_pending_booking()-ээр.
create policy "bookings: read" on public.bookings
  for select using (user_id = auth.uid() or public.can_manage_deal(deal_id));
create policy "bookings: admin update" on public.bookings
  for update using (public.is_admin());

-- payments: өөрийн захиалгынх эсвэл админ. Бичих нь зөвхөн service_role.
create policy "payments: read" on public.payments
  for select using (
    public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
  );

-- favorites
create policy "favorites: own read" on public.favorites for select using (user_id = auth.uid());
create policy "favorites: own insert" on public.favorites for insert with check (user_id = auth.uid());
create policy "favorites: own delete" on public.favorites for delete using (user_id = auth.uid());

-- reviews: хэн ч уншина; зөвхөн өөрийн төлөгдсөн захиалга дээр бичнэ
create policy "reviews: public read" on public.reviews for select using (true);
create policy "reviews: insert on own paid booking" on public.reviews
  for insert with check (
    user_id = auth.uid() and exists (
      select 1 from public.bookings b join public.deals d on d.id = b.deal_id
      where b.id = booking_id and b.user_id = auth.uid() and b.status = 'paid'
        and d.business_id = reviews.business_id
    )
  );
create policy "reviews: own or admin delete" on public.reviews
  for delete using (user_id = auth.uid() or public.is_admin());

-- partner_requests: өөрийнхөө харна/илгээнэ; шийдвэрлэх нь RPC-ээр
create policy "partner_requests: read own or admin" on public.partner_requests
  for select using (user_id = auth.uid() or public.is_admin());
create policy "partner_requests: insert own" on public.partner_requests
  for insert with check (user_id = auth.uid() and status = 'pending' and business_id is null);

-- notifications: өөрийнхөө уншиж, уншсан болгоно
create policy "notifications: own read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: own update" on public.notifications for update using (user_id = auth.uid());
create policy "notifications: own delete" on public.notifications for delete using (user_id = auth.uid());

-- Баганын эрх: callback_token-ийг нууна, мэдэгдлийн зөвхөн is_read-ийг өөрчилнө
revoke select on public.payments from anon, authenticated;
grant select (id, booking_id, provider, invoice_id, qr_text, qr_image, short_url, bank_urls,
              amount, status, paid_at, created_at)
  on public.payments to authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- =====================================================================
-- 10. REALTIME — төлбөрийн төлөв, мэдэгдлийг шууд сонсоно
-- =====================================================================
alter publication supabase_realtime add table public.bookings, public.notifications;

-- =====================================================================
-- 11. STORAGE — зураг (2MB, jpeg/png/webp). Админ болон хамтрагч оруулна.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "images: public read" on storage.objects
  for select using (bucket_id = 'images');
create policy "images: staff upload" on storage.objects
  for insert with check (bucket_id = 'images' and public.current_app_role() in ('admin', 'business'));
create policy "images: staff update" on storage.objects
  for update using (bucket_id = 'images' and public.current_app_role() in ('admin', 'business'));
create policy "images: admin delete" on storage.objects
  for delete using (bucket_id = 'images' and public.is_admin());
