
# Aurelian — GCP Scaffold (Full)
Monorepo with:
- `apps/web` (Next.js + Supabase + Colyseus client) — includes **2D Character Creator** and **Play** page.
- `apps/realtime` (Colyseus WebSocket server)
- `apps/worker` (Always-on world tick)
- `prisma` (Prisma schema)
- GitHub Actions for Cloud Run deploys (realtime + worker).

## Local quick start
```bash
npm i
cp apps/web/.env.example apps/web/.env.local
cp apps/realtime/.env.example apps/realtime/.env
cp prisma/.env.example prisma/.env

# Fill envs (Supabase Dev URL/Anon; Supabase JWKS; DB URL in prisma/.env)
npx prisma migrate dev --name init
npx prisma generate

npm run dev:realtime   # ws://localhost:8787
npm run dev:web        # http://localhost:3000
npm run dev:worker     # http://localhost:8080
```
Open **http://localhost:3000/creator** to make an avatar, then **/play** to move in the shared room.
