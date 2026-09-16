# ⚔ DARKKNIGHT STUDIO

وب‌سایت رسمی استودیوی DARKKNIGHT — ساخته‌شده با **HTML + CSS + Vanilla JS** و **Supabase**.

بدون npm. بدون Node. بدون باندلر.  
فقط پوشه رو باز کن تو VS Code → Live Server → Go Live.

---

## ویژگی‌ها

- سایت عمومی حرفه‌ای (Hero, About, Projects, News, Stats, Team, Links)
- سیستم تم کامل (Darkknight / Midnight / Cyber / Minimal / Light)
- پنل مدیریت کامل (Owner Panel)
- سیستم تیکت پشتیبانی با چت Realtime (بدون نیاز به اکانت کاربر)
- درخواست عضویت در تیم
- آمار و شمارنده بازدید واقعی
- حالت تعمیرات (Maintenance Mode)
- لاگ فعالیت ادمین‌ها
- حضور آنلاین ادمین‌ها (Realtime Presence)
- RLS و امنیت سمت دیتابیس
- ریسپانسیو کامل (موبایل / تبلت / دسکتاپ)
- آماده GitHub Pages

---

## ساختار پروژه

```
darkknight-studio/
├── index.html          # صفحه اصلی
├── projects.html
├── news.html
├── support.html        # تیکت پشتیبانی
├── team.html           # فرم عضویت
├── admin.html          # پنل مدیریت
├── css/
│   ├── themes.css      # سیستم تم (CSS Variables)
│   ├── style.css
│   ├── responsive.css
│   └── admin.css
├── js/
│   ├── utils.js
│   ├── supabase.js
│   ├── theme.js
│   ├── app.js
│   ├── support.js
│   └── admin.js
├── supabase/migrations/
│   ├── 001_schema.sql
│   ├── 002_rls.sql
│   └── 003_storage.sql
├── robots.txt
├── .env.example
└── README.md
```

---

## راه‌اندازی سریع (Local)

1. پوشه `darkknight-studio` را در VS Code باز کن
2. اکستنشن **Live Server** را نصب کن
3. روی `index.html` راست‌کلیک → **Open with Live Server**
4. سایت بدون هیچ installای بالا می‌آید

> تا وقتی کلیدهای Supabase را نگذاری، بخش‌های داینامیک پیام «تنظیم نشده» نشان می‌دهند. UI کامل کار می‌کند.

---

## راه‌اندازی Supabase

### ۱. پروژه بساز
- برو [supabase.com](https://supabase.com) → New Project

### ۲. SQL را اجرا کن
در **SQL Editor** به ترتیب این فایل‌ها را اجرا کن:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls.sql`
3. `supabase/migrations/003_storage.sql`

### ۳. کلیدها را بردار
از **Project Settings → API**:
- `Project URL` → `SUPABASE_URL`
- `anon public` key → `SUPABASE_ANON_KEY`

### ۴. کلیدها را در فرانت بگذار
در **همه فایل‌های HTML** این قسمت را پر کن:

```js
window.DK_CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...'
};
```

فایل‌ها:
- `index.html`
- `admin.html`
- `support.html`
- `projects.html`
- `news.html`
- `team.html`

> **هرگز** `service_role` key را در فرانت نگذار.

---

## ساخت اولین Owner

1. در Supabase برو **Authentication → Users → Add user**
   - یک ایمیل و رمز قوی بساز (مثلاً `owner@darkknight.studio`)

2. `user_id` آن کاربر را کپی کن (از جدول `auth.users` یا از UI)

3. در SQL Editor اجرا کن:

```sql
-- نقش OWNER را پیدا کن
SELECT id FROM roles WHERE name = 'OWNER';

-- ادمین Owner را ثبت کن (role_id را از کوئری بالا بگذار)
INSERT INTO admins (user_id, role_id, display_name, is_active)
VALUES (
  'USER_UUID_HERE',
  'ROLE_UUID_HERE',
  'Owner',
  true
);
```

4. برو `admin.html` و با همان ایمیل/رمز لاگین کن.

---

## حذف خودکار تیکت‌های بسته‌شده

وقتی تیکت Close می‌شود، تابع `close_ticket` فیلد `delete_after` را روی **now + 20 seconds** می‌گذارد.

برای پاک‌سازی واقعی یکی از این‌ها را انجام بده:

### گزینه A — pg_cron (اگر فعال باشد)
```sql
SELECT cron.schedule(
  'cleanup-tickets',
  '*/1 * * * *',  -- هر دقیقه
  $$SELECT cleanup_closed_tickets()$$
);
```

### گزینه B — Supabase Edge Function + Cron
یک Edge Function بنویس که `cleanup_closed_tickets()` را صدا بزند و با Cron هر دقیقه اجرا شود.

### گزینه C — دستی / از پنل
از SQL Editor هر از گاهی:
```sql
SELECT cleanup_closed_tickets();
```

---

## Realtime

برای چت تیکت، در Supabase:
**Database → Replication** و جداول زیر را برای `supabase_realtime` فعال کن:
- `ticket_messages`
- (اختیاری) `admin_presence`

---

## GitHub Pages

1. ریپو بساز و کل پوشه را پوش کن
2. Settings → Pages → Source: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)`
4. چند دقیقه صبر کن

سایت روی `https://USERNAME.github.io/REPO/` بالا می‌آید.

> چون مسیر نسبی است، اگر پروژه داخل ساب‌فولدر است، لینک‌ها درست کار می‌کنند.

---

## امنیت

- فقط `anon` key در فرانت
- تمام دسترسی‌های حساس با **RLS** کنترل می‌شود
- تیکت‌ها با `access_token` امن باز می‌شوند (توکن تصادفی قوی)
- فایل‌های پیوست تیکت در باکت **خصوصی** هستند
- لاگ فعالیت‌ها برای حسابرسی

---

## تم‌ها

دکمه خورشید/ماه در هدر تم را عوض می‌کند:
- Darkknight (پیش‌فرض طلایی)
- Midnight (آبی)
- Cyber (نئون سبز)
- Minimal (سفید/خاکستری)
- Light (روشن)

Owner می‌تواند تم سراسری را از پنل تنظیم کند.

---

## عیب‌یابی

| مشکل | راه حل |
|------|--------|
| داده‌ها لود نمی‌شود | کلیدهای `DK_CONFIG` را چک کن |
| لاگین ادمین نمی‌شود | رکورد `admins` و نقش را چک کن |
| Realtime کار نمی‌کند | Replication را برای جدول روشن کن |
| آپلود فایل | Storage policies و باکت‌ها را از `003_storage.sql` بساز |

---

ساخته‌شده با ⚔ برای DARKKNIGHT STUDIO
