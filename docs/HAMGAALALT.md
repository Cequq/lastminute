# Хамгаалалтад бэлдэх заавар

Удирдамжид «кодоо тайлбарлаж чадахгүй бол кодын асуултын оноо 0», «бүх кодыг нэг дор оруулсан commit-ийг хүлээн авахгүй» гэж заасан. Тиймээс энэ кодыг **хэсэг хэсгээр нь өөрөө оруулж, ойлгож, ажиллуулж** commit хийнэ үү.

## 1. Хөгжүүлэлтийн дараалал (commit бүр нэг алхам)

Алхам бүрийг хийгээд, ажиллаж байгааг шалгаад, дараа нь commit хийнэ. Нэг өдөр бүгдийг биш, долоо хоногуудад тараана.

| # | Хийх ажил | Файл |
|---|---|---|
| 1 | Vite + React + Tailwind, брэнд, өнгө | `package.json`, `index.css`, `Brand.jsx` |
| 2 | Router, Layout, хоосон хуудсууд | `App.jsx`, `Layout.jsx` |
| 3 | Үндсэн хүснэгтүүд + ERD | `migrations` (profiles…reviews) |
| 4 | Бүртгэл, нэвтрэлт, нууц үг сэргээх | `AuthContext`, `pages/auth/*` |
| 5 | RLS + `is_admin`, `can_manage_business` | `migrations` (RLS) |
| 6 | Seed, `deal_listings` view | `seed.sql` |
| 7 | Хямдралын жагсаалт, карт, төрөл | `Deals.jsx`, `DealCard.jsx`, `ub.js` |
| 8 | Динамик үнэ | `pricing.js`, `PriceFuse.jsx` |
| 9 | Хайлт, шүүлт, эрэмбэ, хуудаслалт | `Deals.jsx` |
| 10 | Админ CRUD + зураг (Storage) | `DealsManager`, `AdminBusinesses`, `ImageUpload` |
| 11 | Эрэлт багатай цаг: `quiet_hours`, ачааллын график | `QuietHoursManager`, `BusyChart`, `BusinessPage` |
| **— Хамгаалалт-1 (60%) —** | | |
| 12 | Захиалга үүсгэх функц | `create_pending_booking` |
| 13 | QPay нэхэмжлэл, webhook, шалгах | `supabase/functions/*` |
| 14 | Төлбөрийн хуудас + Realtime | `Checkout.jsx` |
| 15 | Газрын зураг, ойрын газар | `PlacesMap`, `MapPage`, `geo.js` |
| 16 | Хамтрагч болох хүсэлт, хамтрагчийн самбар | `partner_requests`, `pages/partner/*` |
| 17 | Тасалбар шалгах, мэдэгдэл | `lookup_booking`, `CheckIn`, `NotificationBell` |
| 18 | Статистик, Vercel, домэйн | `dashboard_stats`, `StatsDashboard` |
| **— Хамгаалалт-2 (100%) —** | | |

## 2. Гарч магадгүй кодын асуултууд

**«Үнийг яаж тооцдог вэ?»**
`pricing.js` → `discountAt()`. Эхлэхээс `drop_window_hours` цагийн өмнө хямдрал `start_discount`%. Тэр цонхонд хямдрал шугаман байдлаар (`progress` 0→1) `max_discount` хүртэл өснө. Яг ижил томьёо SQL-д (`deal_discount_at`) байгаа. Frontend зөвхөн харуулна, жинхэнэ үнийг сервер тооцно.

**«Хэрэглэгч үнийг өөрчилж хямд төлж чадах уу?»**
Үгүй. `bookings` хүснэгтэд INSERT policy байхгүй. Захиалга зөвхөн `create_pending_booking()` (security definer) функцээр үүснэ, тэр нь үнийг `deal_price_at(d, now())`-оор өөрөө тооцдог.

**«Хоёр хүн сүүлчийн суудлыг зэрэг захиалбал?»**
`select … for update` нь deal мөрийг түгжинэ. Хоёр дахь хүсэлт эхнийх дуусахыг хүлээж, дараа нь `deal_seats_left()` 0 гэж үзээд алдаа буцаана.

**«Webhook-ийг хэн ч дуудаж болох уу?»**
Дуудаж болно, гэхдээ (1) `callback_token` нь payment бүрт санамсаргүй 48 тэмдэгт бөгөөд хэрэглэгчээс нуугдсан (column grant), (2) token зөв байсан ч `/payment/check`-ээр QPay-ээс төлөгдсөн эсэхийг дахин асууна.

**«Яагаад `qpay-webhook`-д `--no-verify-jwt`?»**
QPay Supabase-ийн JWT илгээдэггүй. JWT шалгалт асаалттай бол QPay-ийн дуудлага 401 болно.

**«service_role түлхүүр хаана байна?»**
Зөвхөн Edge Function-ийн орчинд (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`), Supabase өөрөө тохируулдаг. Frontend `.env`-д зөвхөн anon түлхүүр.

**«`is_admin()` яагаад `security definer`?»**
`profiles`-ийн RLS policy дотроос `profiles`-ийг дахин уншвал RLS давталт үүснэ. Security definer нь эзэмшигчийн эрхээр ажиллаж RLS-ийг тойрно.

**«Хэрэглэгч өөрийгөө админ болгож чадах уу?»**
`profiles: own update` policy-ээр өөрийн мөрийг засаж болно, гэвч `protect_profile_role` trigger role өөрчлөгдөж байвал, хүсэлт нэвтэрсэн хэрэглэгчээс ирсэн бөгөөд тэр админ биш бол алдаа шиднэ.

**«Төлбөрийн хуудас яаж өөрөө шинэчлэгддэг вэ?»**
`Checkout.jsx` Supabase Realtime-ийн `postgres_changes`-ийг `bookings` хүснэгтийн тухайн `id`-гаар сонсоно. Webhook төлөвийг `paid` болгомогц event ирнэ. Нөөц болгож 5 секунд тутам polling хийнэ.

**«Зургийн хэмжээг хаана шалгадаг вэ?»**
Хоёр газар: frontend `validateImage()` (2MB, jpeg/png/webp) болон Storage bucket-ийн `file_size_limit`, `allowed_mime_types`. Frontend-ийн шалгалтыг тойрсон ч сервер татгалзана.

**«Хайлтыг яаж хийсэн бэ?»**
`deal_listings` view нь deals + businesses + categories-г нэгтгэж, `current_price`, `seats_left`-ийг тооцдог. `.or('title.ilike.%q%,business_name.ilike.%q%')`-аар хайж, `.range(from, to)` + `count: 'exact'`-аар хуудаслана. Шүүлтүүр URL-д хадгалагдана.

**«Үүнийг хэрхэн өөрчлөх вэ?» төрлийн жишээ**
- Захиалгын түгжих хугацааг 10 минут болгох → `bookings.expires_at` default-ийг `interval '10 minutes'`.
- Нэг хуудсанд 20 карт → `Deals.jsx`-ийн `PAGE_SIZE`.
- Шинэ ангилал нэмэх → Админ → Ангилал (код өөрчлөх шаардлагагүй).


**«Эрэлт багатай цаг одоо идэвхтэй эсэхийг яаж мэддэг вэ?»**
`quiet_hours` нь гараг (0 = Ням), эхлэх, дуусах цагтай. SQL-д `quiet_discount_now()` нь `now() at time zone 'Asia/Ulaanbaatar'`-аар гараг, цагийг тооцно (сервер UTC-ээр ажилладаг тул). Frontend-д `ub.js`-ийн `ubNow()` нь `Intl.DateTimeFormat`-ийн `timeZone`-оор мөн адил тооцно.

**«Хамтрагч өөр байгууллагын хямдралыг засаж чадах уу?»**
Үгүй. `deals: manage` policy нь `can_manage_business(business_id)`-ийг шаарддаг. Энэ функц админ эсвэл `businesses.owner_id = auth.uid()` эсэхийг шалгана. Туршилтаар өөр байгууллагад insert хийхэд RLS алдаа, update хийхэд 0 мөр өөрчлөгдсөн.

**«Хамтрагч болох хүсэлт зөвшөөрөгдөхөд юу болдог вэ?»**
`approve_partner_request()` нэг транзакцид: байгууллага үүсгэж `owner_id`-г хэрэглэгч болгоно, `profiles.role = 'business'`, хүсэлтийг `approved`. Дараа нь `partner_requests_notify` trigger мэдэгдэл үүсгэнэ.

**«Мэдэгдэл хэрхэн ажилладаг вэ?»**
`bookings.status` `paid` болоход `notify_booking_paid` trigger хэрэглэгч болон байгууллагын эзэнд `notifications` мөр нэмнэ. `NotificationBell` Realtime-ээр шинэ мөрийг сонсоно. Хэрэглэгч зөвхөн `is_read` баганыг өөрчлөх эрхтэй (column grant).

**«Тасалбарыг хоёр удаа ашиглаж болох уу?»**
Үгүй. `check_in_booking()` мөрийг түгжээд `checked_in_at` null биш бол алдаа шиднэ.

**«Буцаалтыг хэрхэн хамгаалсан бэ?»**
`request_refund()` нь security definer функц: зөвхөн өөрийн (`user_id = auth.uid()`), төлөгдсөн, ашиглаагүй захиалгыг, эхлэхээс `cancel_hours` цагийн өмнө л цуцлуулна. `bookings`-д хэрэглэгчийн UPDATE эрх байхгүй тул төлөвийг шууд өөрчилж чадахгүй. `mark_refunded()`-ийг зөвхөн тухайн байгууллагын эзэн эсвэл админ дуудна. `refund_requested` төлөвтэй захиалга `deal_seats_left()`-д тоологдохгүй тул суудал шууд чөлөөлөгдөнө.

**«Зайгаар яаж эрэмбэлдэг вэ?»**
Хөтчийн Geolocation API-аар байршил авч (`useMyLocation`), Haversine томьёогоор (`geo.js`) зайг хөтөч дээр тооцно. Байршлыг sessionStorage-д хадгалдаг тул бүх картад зай харагдана.

## 3. Demo-гийн өмнөх шалгах хуудас

- [ ] Админ самбар → «Демо цагуудыг шинэчлэх» дарж бүх хямдралыг ирээдүйд шилжүүлэх
- [ ] Гурван browser: админ, хамтрагч (Dodo Pizza), хэрэглэгч нэвтэрсэн байх
- [ ] Хэрэглэгчээр Dodo Pizza-гийн хямдрал захиалж төлөөд, хамтрагчаар тасалбарын кодыг шалгах
- [ ] Төлбөрийн урсгалыг demo-гоос 10 минутын өмнө нэг удаа турших
- [ ] Sandbox ажиллахгүй бол `QPAY_MODE=mock` болгох (Supabase secret + Vercel env, дахин deploy)
- [ ] Гар утсаар сайтыг нээж харуулахад бэлэн байх
