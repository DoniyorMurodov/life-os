# Life OS

Shaxsiy productivity va hayotni boshqarish ilovasi: vazifalar, jadval, o‘qish, focus timer, xarajatlar, yozuvlar, maqsadlar va statistika — bitta joyda.
Telefonga **PWA** sifatida o‘rnatiladi va **offline** ishlaydi. Barcha ma’lumotlar qurilmangizda (LocalStorage) saqlanadi.

**Stack:** React 19 · Vite · React Router · oddiy CSS · vite-plugin-pwa (Workbox). Backend yo‘q.

---

## 1. Development

```bash
npm install
npm run dev
```

Brauzerda: http://localhost:5173

> Dev rejimda service worker o‘chirilgan (cache muammolari bo‘lmasligi uchun). PWA ni tekshirish uchun production build ishlating (pastda).

## 2. Production build

```bash
npm run build
npm run preview
```

Brauzerda: http://localhost:4173

### PWA ni tekshirish (kompyuterda, Chrome)

1. `npm run build && npm run preview` → http://localhost:4173 ni oching.
2. `F12` → **Application** tab:
   - **Manifest** — nomi “Life OS”, iconlar 192/512, xatolik yo‘q.
   - **Service workers** — `sw.js` *activated and is running*.
   - **Cache storage** — `workbox-precache-…` ichida JS/CSS/HTML/iconlar.
3. Manzil satrining o‘ng tomonida **Install** (⊕) belgisi chiqadi.
4. Offline test: Application → Service workers → **Offline** ✓ ni belgilang → sahifani yangilang. Ilova ishlashda davom etadi.
5. Qo‘shimcha: **Lighthouse** → “Progressive Web App” / “Best practices” auditini ishga tushiring.

> PWA faqat **HTTPS** yoki **localhost** da o‘rnatiladi. Telefonda ishlatish uchun saytni deploy qiling (Vercel — eng oson, bepul).

---

## 3. GitHub’ga joylash

GitHub’da yangi bo‘sh repository yarating (masalan `life-os`, README qo‘shmasdan). Keyin loyiha papkasida:

```bash
git init
git add .
git commit -m "Life OS v1.0"
git branch -M main
git remote add origin https://github.com/<USERNAME>/life-os.git
git push -u origin main
```

`.gitignore` allaqachon `node_modules`, `dist`, `.env` va boshqalarni chiqarib tashlaydi.

## 4. Deploy — Vercel (tavsiya etiladi)

1. https://vercel.com → GitHub bilan kiring.
2. **Add New → Project** → `life-os` repository’ni tanlang → **Import**.
3. Sozlamalar avtomatik aniqlanadi: Framework **Vite**, Build `npm run build`, Output `dist`.
4. **Deploy** → bir necha soniyadan keyin `https://life-os-xxx.vercel.app` manzili tayyor.

`vercel.json` ichidagi rewrite tufayli `/tasks`, `/focus` kabi sahifalarni yangilaganda 404 chiqmaydi.
Har safar `git push` qilganingizda Vercel avtomatik qayta deploy qiladi, ilova esa telefonda o‘zi yangilanadi.

### Muqobil: GitHub Pages

```bash
# Repository nomi life-os bo‘lsa:
BASE_PATH=/life-os/ npm run build          # Windows PowerShell: $env:BASE_PATH="/life-os/"; npm run build
npx gh-pages -d dist
```

So‘ng GitHub → Settings → Pages → Branch: `gh-pages` → Save.
Manzil: `https://<USERNAME>.github.io/life-os/`. (Build `dist/404.html` ni ham yaratadi, shuning uchun sahifani yangilash ishlaydi.)

---

## 5. Telefonga o‘rnatish

**Android (Chrome):**
Deploy qilingan saytni oching → ⋮ menyu → **Install app** (yoki **Add to Home screen**) → Install.
Ilova ichida ham: **Settings → Install Life OS → Install** tugmasi bor.

**iPhone (Safari):**
Saytni **Safari**da oching → **Share** (□↑) → **Add to Home Screen** → Add.

O‘rnatilgandan keyin Life OS alohida ilova kabi ochiladi (brauzer paneli yo‘q) va internetsiz ishlaydi.

---

## 6. Ma’lumotlar va backup

- Hammasi qurilma ichida saqlanadi (`lifeos:*` kalitlari bilan LocalStorage).
- **Settings → Export data** — JSON backup yuklab olinadi. Muntazam qiling!
- **Settings → Import data** — backupdan tiklash (masalan, kompyuterdan telefonga ko‘chirish).
- **Settings → Reset all data** — tasdiqlash oynasi bilan hammasini o‘chiradi.
- **Cloud sync** yoqilsa (10-bo‘lim), ma’lumotlar bulutga ham saqlanadi va qurilmalar o‘rtasida avtomatik sinxron bo‘ladi. Yoqilmagan bo‘lsa — Export/Import bilan ko‘chiring.

## 7. Arxitektura

```
src/
  components/   UI bloklar: Sidebar, MobileNavbar, Header, StatCard, TaskCard, ProgressBar,
                Modal, EmptyState, Toast, Segmented, Field, BarChart, AIAssistant, formlar...
  pages/        Home, Tasks, Schedule, Study, Focus, Money, Notes, Goals, Statistics, Settings, Onboarding
  context/      AppContext (barcha ma’lumotlar + CRUD), FocusContext (Pomodoro timer), SyncContext (cloud sync)
  hooks/        useLocalStorage / useCollection, useTheme, useInstallPrompt
  utils/        storage.js (getData/setData/removeData, export/import/reset), date.js, calculations.js
  services/     ai.js (AI planner), syncEngine.js + supabase.js (cloud sync), push.js (fon bildirishnomalari)
api/            Vercel serverless funksiyalar: plan.js (Claude), push.js + push-send.js (Web Push + QStash)
supabase/       schema.sql — sinxronizatsiya jadvali va xavfsizlik qoidalari
public/push-sw.js  service worker’ga qo‘shiladigan push handler
  data/         defaultData.js (default ma’lumotlar, kategoriyalar), navigation.js
scripts/        generate-icons.mjs — PWA iconlarni yaratadi (npm run icons)
```

- **Storage:** barcha o‘qish/yozish `utils/storage.js` orqali. Buzilgan ma’lumot bo‘lsa default qiymat ishlatiladi. Ilova har doim avval lokal ishlaydi (offline-first); sync fonda.
- **Streak:** kun davomida kamida bitta task bajarilsa, o‘sha kun hisoblanadi; ketma-ket kunlar soni — streak.
- **Focus timer:** tugash vaqtini (timestamp) saqlaydi — sahifa almashtirilsa yoki yangilansa ham to‘g‘ri ishlaydi. Tugagan sessiya Statistics’ga, fan tanlangan bo‘lsa Study’ga ham qo‘shiladi.

## 8. AI Assistant (Claude)

Uch rejim:
- **Offline planner (bepul, standart)** — **Generate Plan** tugmasi. Internet ham, API key ham kerak emas.
- **Open in Claude (bepul)** — tayyor so‘rovni (bugungi tasklar va fanlar bilan) clipboard’ga nusxalaydi va claude.ai ni ochadi. Siz faqat joylab yuborasiz — javob o‘zingizning Claude akkauntingiz (bepul yoki obuna) hisobidan. Clipboard ishlamasa, matn ilovada ko‘rsatiladi.
- **Claude AI (ixtiyoriy, pullik)** — Vercel’da `ANTHROPIC_API_KEY` qo‘shilsa, **Generate Plan** reja’ni `api/plan.js` orqali Claude bilan tuzadi.

> Claude Pro/Max obunasining OAuth tokeni (`CLAUDE_CODE_OAUTH_TOKEN`) bu yerda ishlatilmaydi: Anthropic qoidalariga ko‘ra u faqat Claude Code va Anthropic’ning o‘z ilovalari uchun. Bepul yo‘l — **Open in Claude**.

### Pullik Claude AI’ni yoqish (ixtiyoriy)

1. https://console.anthropic.com → **API Keys** → yangi key yarating (to‘lov kartasi/kredit kerak — so‘rov boshiga bir necha sent).
2. Vercel → loyihangiz → **Settings → Environment Variables**:
   - `ANTHROPIC_API_KEY` = sizning key’ingiz
   - `APP_ACCESS_CODE` = o‘zingiz o‘ylab topgan parol (tavsiya etiladi — busiz sayt manzilini bilgan har kim sizning key’ingizdan foydalana oladi)
3. **Deployments → Redeploy**.
4. Telefonda: **Settings → AI Assistant → AI access code** ga `APP_ACCESS_CODE` dagi parolni kiriting → Save.

Serverga faqat kerakli ma’lumot yuboriladi: bajarilmagan tasklar nomi/priority/deadline va fanlar progressi (20 ta task, 500 belgili so‘rov chegarasi). Access code backup fayliga yozilmaydi.

⚠️ API key’ni hech qachon frontend kodiga yoki `VITE_*` o‘zgaruvchisiga yozmang — u har bir foydalanuvchiga ochiq bo‘ladi. `api/plan.js` key’ni faqat server muhitidan o‘qiydi.

## 9. Ma’lumotlarni himoya qilish

- Ilova brauzerdan **doimiy saqlash** (persistent storage) so‘raydi — Settings → Data → *Storage protection* da holati ko‘rinadi.
- Oxirgi backupdan 7 kun o‘tsa, Home sahifasida eslatma chiqadi (**Back up now** / **Later**).
- Backup faylini Google Drive yoki Telegram “Saved Messages” ga saqlab qo‘ying.

## 10. Cloud sync (Supabase) — telefon ↔ kompyuter

Har bir yozuv (task, note, xarajat…) alohida sinxronlanadi: o‘zgarishdan ~2.5 s keyin, ilova ochilganda, internet qaytganda va har daqiqada. Ikki qurilmada turli yozuvlar o‘zgartirilsa — ikkalasi ham saqlanadi; bitta yozuv ikki joyda o‘zgarsa — oxirgisi yutadi. Offline paytdagi o‘zgarishlar internet qaytganda yuboriladi.

### Yoqish (bir marta, ~10 daqiqa, bepul)

1. https://supabase.com → **Start your project** → GitHub bilan kiring → **New project** (nom: `life-os`, region: Frankfurt yoki eng yaqini, database parolini saqlab qo‘ying).
2. **SQL Editor → New query** → `supabase/schema.sql` faylining hammasini joylang → **Run**.
3. **Authentication → URL Configuration → Site URL** = Vercel manzilingiz (masalan `https://life-os-xxx.vercel.app`). Tasdiqlash emaildagi havola shu yerga qaytaradi.
4. **Project Settings → API** dan oling: *Project URL* va *anon public* key.
5. Vercel → **Settings → Environment Variables**: `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY` → **Redeploy**.
6. Ilovada: **Settings → Cloud sync → Create account** → emailni tasdiqlang → **Sign in**.
7. Ikkinchi qurilmada: onboarding’da **“Already have an account? Restore from cloud”** yoki Settings → Cloud sync → Sign in.

> `anon` key ochiq kalit — frontendda turishi normal. Xavfsizlikni `schema.sql` dagi Row Level Security ta’minlaydi: har kim faqat o‘z yozuvlarini ko‘radi.

## 11. Fon bildirishnomalari (ilova yopiq bo‘lsa ham)

Focus timer boshlanganda server (Upstash QStash) tugash vaqtiga push-xabarni rejalashtiradi; pause/reset qilinsa bekor qilinadi. Android Chrome’da ishlaydi; iPhone’da faqat **Home Screen’ga o‘rnatilgan** ilovada (iOS 16.4+).

### Yoqish (bir marta, bepul)

1. **VAPID kalitlar:** loyiha papkasidagi `.env.local` faylida tayyor (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Yangisini yaratish: `npx web-push generate-vapid-keys`.
2. https://console.upstash.com → ro‘yxatdan o‘ting → **QStash** bo‘limi → `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` ni nusxalang.
3. Vercel → **Environment Variables** ga shu 6 ta qiymatni qo‘shing → **Redeploy**.
4. Telefonda: Settings → Notifications yoqilgan → *Background alerts* → **Allow** → **Test** → ilovani yoping → ~10 soniyada xabar keladi.

## 12. To‘liq sozlash ro‘yxati (Vercel Environment Variables)

| O‘zgaruvchi | Qayerdan | Nima uchun |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Claude AI planner (pullik) |
| `APP_ACCESS_CODE` | o‘zingiz o‘ylab topasiz | Server funksiyalarini begonalardan himoya qiladi |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Cloud sync |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `.env.local` | Fon bildirishnomalari |
| `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Upstash → QStash | Bildirishnomani vaqtida yuborish |

Har bir guruh ixtiyoriy: qo‘shilmasa, o‘sha funksiya o‘chiq turadi va ilova lokal ishlashda davom etadi. O‘zgaruvchi qo‘shgandan keyin har doim **Redeploy** qiling.

## 13. Scriptlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (`dist/`) + PWA service worker |
| `npm run preview` | Build’ni lokal ko‘rish |
| `npm run lint` | Oxlint tekshiruvi |
| `npm run icons` | PWA iconlarni qayta yaratish |
