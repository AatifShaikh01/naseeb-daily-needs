# NASEEB DAILY NEEDS & AGENCIES

Distribution agency ke liye **stock + sales + payment tracking** web app.
Ye app 3 log use karenge — **Owner (Papa), Bhai aur Admin (main)**.

> **Phase 2 (current):** DB schema + migrations + seed, login/PIN auth, role permissions (owner-only delete), E2E tests. Abhi: stock/sales/payments **screens placeholder** hain — Phase 4+ me.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14+ (App Router, tested on Next 16) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui style components + lucide-react icons |
| Database | Neon Postgres (serverless) + Drizzle ORM (`@neondatabase/serverless`) |
| Auth | Username + PIN login, JWT cookie session via `jose` (no third-party auth) |
| PWA | Installable (manifest + icons + minimal service worker) |
| Deploy | Vercel |

---

## Setup Steps

### 1. Requirements

- Node.js 20+ (recommended: latest LTS)
- npm 10+
- Neon account (https://neon.tech) — sirf DB phase ke liye zaroori

### 2. Install

```bash
npm install
```

### 4. Environment variables

`.env.local` file banayein (example ke liye `.env.local.example` dekhein):

```bash
# Neon se milne wali postgresql://... Connection String (REST URL nahi)
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
# JWT secret — long random string
AUTH_SECRET="some-long-random-string"
# Optional: seed users ka default PIN (default "1234")
# SEED_PIN="1234"
```

> **Note:** `.env.local` git me commit mat karna (`.gitignore` me excluded hai).
> Local dev ke liye Docker Postgres bhi chalega:
> `docker run -d --name naseeb-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=naseeb -p 5433:5432 postgres:15`

### 5. Database migrate + seed

```bash
npm run db:generate   # schema se SQL migration files generate
npm run db:migrate    # migrations apply karo (DATABASE_URL pe)
npm run db:seed       # 3 users + sample products + customers
npm run db:studio     # Drizzle Studio — data browse karo (http://localhost:4983)
```

**Seed ke baad:**

| Username | Role | PIN |
| --- | --- | --- |
| `papa` | owner | `1234` (ya `SEED_PIN`) |
| `bhai` | staff | same |
| `me` | staff | same |

Pehle login par app khud **PIN change** karne ko bolega (must_change_pin flag).
Sab actions `audit_log` table me record hote hain (create/update/delete + user + jsonb details).

### 6b. Role permissions

| Action | Owner (papa) | Staff (bhai, me) |
| --- | --- | --- |
| Login, PIN change, apna logout | ✅ | ✅ |
| Product / Customer add + edit | ✅ | ✅ |
| Product / Customer **delete** | ✅ | ❌ (server par block, UI me hidden) |
| Stock / Sale / Payment entries | ✅ (Phase 4+) | ✅ (Phase 4+) |

Delete permission **server-side enforce** hoti hai (client JS bypass karne se bhi block rehta hai).

### 6c. E2E test (login + roles)

Dev server chalte hue (`npm run dev --port 3300`), doosre terminal me:

```bash
npm run test:e2e        # scripts/e2e.mjs — 48 checks
```

Test karta hai: protected-route redirect, galat PIN, login (owner/staff), PIN change,
saare dashboard pages, header user name, logout, staff delete block, owner delete + audit trail.

### 6. Run

```bash
npm run dev        # development → http://localhost:3000
npm run build      # production build verify karna
npm start          # production server
```

### 5. PWA icons (optional regenerate)

```bash
npm run icons      # public/icon-192.png, icon-512.png, icon-180.png
```

Icons ek zero-dependency Node script (`scripts/generate-icons.mjs`) se bante hain — teal background + white "N" + amber bar. Design change karna ho to script edit karke dobara run karein.

---

## Folder Structure

```
src/
├── app/
│   ├── (dashboard)/          # App shell ke under saare pages
│   │   ├── layout.tsx        # header + sidebar + bottom nav
│   │   ├── page.tsx          # Home (dashboard)
│   │   ├── stock/page.tsx    # Stock (placeholder)
│   │   ├── sale/page.tsx     # Sale (placeholder)
│   │   ├── pending/page.tsx  # Pending payments (placeholder)
│   │   └── more/page.tsx     # More (placeholder)
│   ├── layout.tsx            # Root layout (Inter font, metadata, SW register)
│   ├── manifest.ts           # PWA manifest (route: /manifest.webmanifest)
│   ├── icon.svg              # Browser tab icon
│   └── globals.css           # Theme: green primary + amber accent
├── components/
│   ├── layout/               # header, sidebar, bottom-nav, page-header
│   ├── pwa/                  # service-worker-register
│   └── ui/                   # shadcn-style button, card
├── db/
│   ├── index.ts              # Drizzle client (Neon serverless / pg fallback)
│   ├── schema.ts             # 8 tables: users, products, customers, stock_in, sales, sale_items, payments, audit_log
│   └── migrations/           # drizzle-kit generated SQL
├── lib/
│   ├── navigation.ts         # Nav items (Home, Stock, Sale, Pending, More)
│   ├── pin.ts                # PBKDF2 PIN hash + verify
│   ├── session.ts            # JWT create/verify (jose), cookie config
│   ├── actions/
│   │   ├── auth.ts           # login, logout, change-pin, getSession
│   │   ├── products.ts       # save + delete (owner-only)
│   │   └── customers.ts      # save + delete (owner-only)
│   └── utils.ts              # cn() helper
├── proxy.ts                  # Next 16 middleware: route protection (JWT check)
└── ...
public/
├── icon-192.png / icon-512.png / icon-180.png
└── sw.js                     # minimal offline/service worker
scripts/
├── generate-icons.mjs        # PNG icon generator (no deps)
├── migrate.mjs               # custom migration runner
├── seed.mjs                  # users + products + customers
└── e2e.mjs                   # end-to-end auth + role tests (npm run test:e2e)
```

---

## Layout Notes

- **Mobile:** top header + bottom navigation (Home, Stock, Sale, Pending, More)
- **Desktop (md+):** top header + left sidebar, bottom nav hidden
- **Theme:** primary deep green `#0F766E`, amber accent `#F59E0B`, white cards, `rounded-2xl`, soft shadows, Inter font
- Naye shadcn components add karne ke liye: `npx shadcn@latest add <component>` (`components.json` already configured)

## Deploy (Vercel)

1. Code ko GitHub pe push karein.
2. https://vercel.com/new se repo import karein (framework auto-detect: Next.js).
3. Project Settings → Environment Variables me `DATABASE_URL` add karein.
4. Deploy — done. PWA mobile me "Add to Home Screen" se install ho jayega.

---

## Roadmap

- [x] Phase 1 — Skeleton, layout, theme, PWA base
- [x] Phase 2 — DB schema (users, products, customers, stock_in, sales, sale_items, payments, audit_log) + Drizzle + migrations + seed
- [x] Phase 3 — Auth (username + PIN, JWT cookie, route protection, PIN change, roles, audit log)
- [ ] Phase 4 — Stock management (stock in/out, current stock)
- [ ] Phase 5 — Sale entry + history (multi-item sales)
- [ ] Phase 6 — Pending payments + reports
