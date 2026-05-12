# 🏕️ Camp Jubilee — Parent Portal

A full-stack web app for Camp Jubilee summer camp. Handles tuition payments, camper store accounts, parent-to-camper messaging, daily photo gallery, and camp information.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage)
- **Payments:** Square API
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Hosting:** Vercel + Supabase

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `SQUARE_ACCESS_TOKEN` | Square Developer Dashboard → Credentials |
| `SQUARE_APPLICATION_ID` | Square Developer Dashboard → Credentials |
| `SQUARE_LOCATION_ID` | Square Developer Dashboard → Locations |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | Same as above |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | Same as above |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project Settings → Your apps |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase Console → Cloud Messaging → Web push certificates |
| `FIREBASE_SERVER_KEY` | Firebase Console → Cloud Messaging → Server key |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (dev) or your Vercel URL (prod) |

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in SQL Editor:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Create a Storage bucket named **`camp-photos`** with public access enabled
4. Add your first director account:
   - Register via the app, then run in Supabase SQL Editor:
     ```sql
     UPDATE users SET role = 'director' WHERE email = 'your@email.com';
     ```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Roles & URLs

| Role | Entry Point | What they do |
|---|---|---|
| **Director** | `/admin` | Full control — sessions, campers, parents, finances, messages, info pages |
| **Parent** | `/dashboard` | View campers, pay tuition, add store funds, send messages, view photos |
| **Store Staff** | `/store` | Look up campers, deduct store balance, view transaction log |
| **Media Team** | `/media` | Upload photos, tag campers |

### Creating staff accounts

1. Register a normal account via `/register`
2. Director updates the role in Supabase SQL Editor:
   ```sql
   UPDATE users SET role = 'media' WHERE email = 'photographer@example.com';
   -- roles: director | media | store | parent
   ```

---

## Feature Summary

### ✅ Authentication
- Email/password login and registration
- Forgot password / reset password flow
- Role-based route protection via middleware

### ✅ Parent → Camper Linking
- Parents enter an 8-character camper code
- Director can also manually link from `/admin/parents`
- Pending links show in director dashboard for approval

### ✅ Payments (Square)
- Tuition deposit + balance payments via Square checkout
- Parents add funds to camper store account
- Full transaction history per camper

### ✅ Camp Store
- Staff search camper by name, view balance, deduct amount + note
- Cannot go below $0 (validation on server + client)
- Running log of all transactions

### ✅ Parent-to-Camper Messaging
- Only available when session `is_active = true`
- Director inbox with unread/delivered filter
- One-click print view per message

### ✅ Photo Gallery
- Media team uploads single or bulk photos with camper tags
- Parents see gallery grouped by day, filterable by their camper
- Lightbox view + download button

### ✅ Camp Info
- Announcements feed (director posts, push notification sent)
- Emergency contacts & address (admin-editable)
- Packing list & camp rules (admin-editable)

### ✅ Push Notifications (FCM)
- Browser permission requested on parent dashboard
- Fires on: new announcement, new photo batch uploaded

### ✅ End-of-Session
- Director closes session → parents prompted at `/session-close`
- Parent chooses: **Refund** or **Donate** remaining store balance
- Director sees all choices in Finances panel

---

## Project Structure

```
camp-jubilee/
├── app/
│   ├── (auth)/          # Login, register, forgot/reset password
│   ├── (parent)/        # Parent-facing: dashboard, camper, payments, messages, photos, info
│   ├── (admin)/         # Director panel: campers, parents, messages, finances, session, info
│   ├── (store)/         # Store staff interface
│   ├── (media)/         # Media team upload interface
│   └── api/             # All API routes
├── components/
│   ├── admin/           # Admin-specific components
│   ├── store/           # Store interface component
│   ├── media/           # Media uploader component
│   └── *.tsx            # Shared components (NavBar, AppShell, etc.)
├── lib/
│   ├── supabase/        # Client, server, middleware helpers
│   ├── firebase.ts      # FCM push notification setup
│   └── utils.ts         # Formatting helpers
├── hooks/               # useUser, useCampers
├── types/               # TypeScript types for all DB models
├── public/
│   ├── manifest.json    # PWA manifest
│   ├── firebase-messaging-sw.js
│   └── icons/           # Drop icon-192.png and icon-512.png here
└── supabase/
    └── migrations/      # SQL migration files
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
5. Deploy

---

## PWA Icons

Drop two files into `public/icons/`:
- `icon-192.png` — 192×192px Camp Jubilee logo
- `icon-512.png` — 512×512px Camp Jubilee logo

---

## Square — Sandbox vs Production

The Square client uses `Environment.Sandbox` unless `NODE_ENV=production`. Use sandbox credentials for local development — get them from the Square Developer Dashboard.

---

## Development Phases Completed

- [x] Phase 1 — Auth, roles, camper profiles, parent linking
- [x] Phase 2 — Square payments, tuition, store accounts
- [x] Phase 3 — Messaging, director inbox, print view
- [x] Phase 4 — Photo gallery, media upload, camper tagging
- [x] Phase 5 — Announcements, info pages, push notifications
- [x] Phase 6 — End-of-session balance flow, cabin reveal toggle, PWA
