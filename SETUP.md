# BenchOps Tracker – Full-Stack Setup

## Prerequisites
- Node.js 18+
- A Supabase project (ID: gjuynieqwujaijjitugo)

---

## 1. Apply Database Schema

In your Supabase dashboard → SQL Editor, run the contents of, in order:
```
supabase/migrations/001_schema.sql
supabase/migrations/002_tracking.sql
supabase/migrations/003_fix_users_must_change_password.sql
```

`002_tracking.sql` adds the `linkedin_profiles`, `resumes`, and `job_applications` tables that back the daily LinkedIn/resume/application tracker.

`003_fix_users_must_change_password.sql` backfills a `must_change_password` column that `users` was missing in this project (despite 001 declaring it) — without it, adding a new account manager from the admin panel fails with a 500.

---

## 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and fill in:
#   JWT_SECRET       — any long random string (64+ chars)
#   SUPABASE_SERVICE_KEY — from Supabase dashboard → Settings → API → service_role key

npm install
npm run dev
```

Backend runs on http://localhost:3001

---

## 3. Seed the Database

After backend .env is configured:
```bash
cd supabase
npm install @supabase/supabase-js bcryptjs dotenv   # one-time
node seed.js
```

This creates:
- **Admin**: alok.singh@benchops.com / Admin@BenchOps2024
- **14 account managers**: e.g. aashima.soni@benchops.com / BenchOps@2024
- **4 default portals**: LinkedIn, Naukri, Indeed, Internshala

Then, once (creates the private `resumes` storage bucket used for resume uploads/quick-view):
```bash
node setup-storage.js
```

---

## 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

The Vite dev server proxies `/api/*` to the backend automatically — no CORS issues in dev.

---

## 5. URLs

| URL | Description |
|-----|-------------|
| http://localhost:5173/ | Landing page with team cards |
| http://localhost:5173/login?email=... | Account manager login |
| http://localhost:5173/admin-login | Admin login (dark theme) |
| http://localhost:5173/dashboard | Manager dashboard |
| http://localhost:5173/admin | Admin dashboard |

---

## Production Deployment

1. Build frontend: `cd frontend && npm run build` → serves `dist/`
2. Set `FRONTEND_URL` in backend `.env` to your production domain
3. Point a static host (Vercel/Netlify) at `frontend/dist`
4. Deploy backend to Railway/Render/Fly.io
