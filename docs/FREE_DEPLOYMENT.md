# Free Deployment Guide

This is the recommended free deployment split for Qrave:

- Frontend: Vercel Hobby
- Backend API: Render free web service
- Database: Supabase free Postgres
- Image uploads: Cloudinary free account

Redis is not required for the current single-instance deployment. SignalR runs inside the API process. Add Redis later only when running multiple API instances.

## 1. Create Supabase Database

1. Create a Supabase project.
2. Open Project Settings > Database.
3. Copy the connection string.
4. Use the pooler or direct connection string, then append:

```text
Pooling=true;Timeout=15;Command Timeout=30;Timezone=Asia/Kolkata
```

5. Open Supabase SQL Editor and run these files in order:

```text
database/postgres/001_schema.sql
database/postgres/002_indexes.sql
database/postgres/006_ist_timezone.sql
database/postgres/007_menu_item_diet_type.sql
database/postgres/003_functions.sql
database/postgres/008_fix_menuitem_update_ambiguity.sql
database/postgres/005_backfill_order_totals.sql
```

Run `database/postgres/004_seed_demo.sql` only if you want demo data.

## 2. Deploy Backend API On Render

Create a new Render Web Service:

- Source: `https://github.com/jatincodes-lab/Qrave`
- Runtime: Docker
- Dockerfile path: `src/backend/QRApp.Api/Dockerfile`
- Docker context: `.`
- Plan: Free

Environment variables:

```text
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
ConnectionStrings__Postgres=<your-supabase-postgres-connection-string>
Jwt__SigningKey=<at-least-32-random-characters>
Cors__AllowedOrigins__0=<your-vercel-frontend-url>
Cloudinary__CloudName=<cloudinary-cloud-name>
Cloudinary__ApiKey=<cloudinary-api-key>
Cloudinary__ApiSecret=<cloudinary-api-secret>
Cloudinary__UploadFolder=qrave
Cloudinary__UploadPreset=
```

After deploy, check:

```text
https://<your-render-service>.onrender.com/health
```

## 3. Deploy Frontend On Vercel

Create a new Vercel project:

- Import repository: `https://github.com/jatincodes-lab/Qrave`
- Framework preset: Next.js
- Root directory: `src/frontend`
- Build command: `npm run build`
- Output directory: leave default

Environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com
```

Deploy the frontend.

## 4. Update Backend CORS

After Vercel gives you the final frontend URL, go back to Render and set:

```text
Cors__AllowedOrigins__0=https://<your-vercel-app>.vercel.app
```

Redeploy the Render API.

## 5. Smoke Test

1. Open the Vercel frontend URL.
2. Register or log in.
3. Create a branch, table, category, and menu item.
4. Open the generated QR menu URL.
5. Place an order.
6. Confirm the order appears in admin orders/kitchen.
7. Move the order through the status flow.

## Free Tier Notes

- Render free web services can sleep when idle, so the first request after inactivity can be slow.
- Render free Postgres is time-limited, so Supabase is recommended for the database.
- Vercel can host the frontend, but it should not host this API because the API needs a long-running ASP.NET Core process and SignalR WebSockets.
- Do not put production secrets in `.env.production.example`; use hosting provider environment variables.
