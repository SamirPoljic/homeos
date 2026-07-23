# Home OS

Personalni "home operating system" — monorepo: React frontend (Vercel) + Express backend (Render) + Supabase (Postgres + Auth + Storage).

## Struktura

```
homeos/
├── frontend/     -> React + Vite, deploy na Vercel
├── backend/      -> Express API, deploy na Render
```

## Faza 0 — Setup, korak po korak

### 1. Supabase

1. Idi na https://supabase.com → New Project
2. Kad je projekat kreiran: **Project Settings → API** i zapamti:
   - `Project URL` → treba u `SUPABASE_URL` (backend) i `VITE_SUPABASE_URL` (frontend)
   - `anon public` key → treba u `VITE_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → treba u `SUPABASE_SERVICE_ROLE_KEY` (backend, **nikad na frontend!**)
3. Idi na **SQL Editor → New query**, zalijepi cijeli sadržaj `backend/migrations/001_init.sql` i pokreni (RUN)
4. Provjeri u **Table Editor** da su se tabele kreirale (households, tasks, profiles...)
5. **Authentication → Providers** — Email provider je uključen po defaultu, to je dovoljno za Fazu 0

### 2. GitHub

```bash
cd homeos
git init
git add .
git commit -m "Faza 0: initial scaffold"
git branch -M main
git remote add origin https://github.com/<tvoj-username>/homeos.git
git push -u origin main
```

### 3. Backend na Render.com

1. Render dashboard → **New → Web Service**
2. Poveži GitHub repo
3. **Root Directory**: `backend`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. Dodaj Environment varijable (Render dashboard → Environment):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL` (postavi kasnije na Vercel URL, za sada može ostati prazno ili `*`)
7. Deploy. Kad završi, otvori `https://<tvoj-servis>.onrender.com/health` — treba vratiti `{"status":"ok",...}`
8. Otvori `/health/db` — treba vratiti `{"status":"ok","db":"connected"}` (ovo potvrđuje da backend vidi Supabase)

### 4. Frontend na Vercel

1. Vercel dashboard → **Add New → Project**
2. Poveži isti GitHub repo
3. **Root Directory**: `frontend` (Vercel automatski prepozna Vite)
4. Dodaj Environment varijable (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` → URL backend-a sa Render-a (npr. `https://homeos-backend.onrender.com`)
5. Deploy
6. Vrati se na Render i ažuriraj `FRONTEND_URL` na pravi Vercel URL (radi CORS-a), redeploy backend

### 5. Provjera da sve radi (Definicija gotovo za Fazu 0)

1. Otvori Vercel URL → treba te prebaciti na `/login`
2. Registruj se (email + lozinka) — Supabase Auth kreira usera
3. Nakon uspješne registracije/prijave, vidiš Dashboard stranicu sa:
   - ✅ Backend povezan
   - ✅ Baza povezana

Ako sve tri stavke pokazuju ✅, Faza 0 je gotova — infrastruktura radi end-to-end u produkciji.

## Lokalni razvoj

**Backend:**
```bash
cd backend
cp .env.example .env   # popuni sa Supabase vrijednostima
npm install
npm run dev            # http://localhost:4000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env    # popuni sa Supabase + lokalnim backend URL-om
npm install
npm run dev             # http://localhost:5173
```

## Sljedeće (Faza 1)

Households + members CRUD (skeleton već postoji u `backend/src/routes/households.js`), HouseholdContext na frontendu, app registry mehanizam.
