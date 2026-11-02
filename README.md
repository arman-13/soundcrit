# Content Platform

A full-stack content platform for articles, music, and video. Built with ASP.NET Core 8, PostgreSQL/EF Core, and Next.js.

## Stack

| Layer    | Technology                             |
|----------|----------------------------------------|
| Backend  | ASP.NET Core 8 Web API                 |
| ORM      | Entity Framework Core 8 (code-first)   |
| Database | PostgreSQL (Npgsql provider)           |
| Frontend | Next.js 16 (App Router) + Tailwind CSS |
| Deploy   | Vercel (frontend)                      |

---

## Project Structure

```
content-platform/
├── backend/          # ASP.NET Core Web API
│   ├── Controllers/  # Articles, Tracks, Videos, Team
│   ├── Data/         # AppDbContext + seed data
│   ├── DTOs/         # PagedResponse<T>
│   ├── Migrations/   # EF Core migrations
│   └── Models/       # Article, Track, Video, TeamMember
└── frontend/         # Next.js app
    ├── app/          # App Router pages
    ├── components/   # Header, Footer, AudioPlayer
    ├── lib/          # API client, AudioPlayerContext
    └── types/        # TypeScript interfaces
```

---

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org)
- [PostgreSQL 15+](https://www.postgresql.org)
- [dotnet-ef tool](https://learn.microsoft.com/en-us/ef/core/cli/dotnet)

---

## Running Locally

### 1. Database

Create a PostgreSQL database:

```bash
psql -U postgres -c "CREATE DATABASE content_platform;"
```

### 2. Backend

Create `backend/appsettings.Development.json` by copying the template:

```bash
cd backend
cp appsettings.Development.json.example appsettings.Development.json
```

Fill in the values it lists. Two are required or the app will refuse to start:

| Setting | Notes |
| --- | --- |
| `ConnectionStrings:DefaultConnection` | Default local value: `Host=localhost;Port=5432;Database=content_platform;Username=postgres;Password=postgres` |
| `Jwt:Key` | Any random string of at least 32 bytes. Generate one with `openssl rand -base64 48` |

The remaining settings (Supabase, Cloudinary, Resend) are only needed for the
features that use them: audio upload, image upload, and transactional email.

This file is gitignored. Never commit real values to it. In deployed
environments every setting comes from environment variables instead, using
`__` for nesting, so `Jwt:Key` becomes `Jwt__Key`.

```bash
dotnet run
```

The API will be available at `http://localhost:5000`.  
Swagger UI: `http://localhost:5000/swagger`

Migrations are **not** applied automatically. After pulling changes that add a
migration, run `dotnet ef database update` (see the migration commands below)
before starting the app, or entity queries will fail on the missing columns.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## EF Core Migration Commands

```bash
cd backend

# Install the EF CLI tool (requires .NET 10)
dotnet tool install --global dotnet-ef --version 8.*

# Create a new migration
dotnet ef migrations add <MigrationName>

# Apply migrations to the database
dotnet ef database update

# Revert to a specific migration
dotnet ef database update <MigrationName>

# Remove the last unapplied migration
dotnet ef migrations remove
```

---

## API Endpoints

### Articles
| Method | Route                    | Description           |
|--------|--------------------------|-----------------------|
| GET    | `/api/articles`          | All published articles (paginated) |
| GET    | `/api/articles/{slug}`   | Single article by slug |
| POST   | `/api/articles`          | Create article        |
| PUT    | `/api/articles/{id}`     | Update article        |
| DELETE | `/api/articles/{id}`     | Delete article        |

### Tracks
| Method | Route              | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/tracks`      | All published tracks (paginated) |
| GET    | `/api/tracks/{id}` | Single track        |
| POST   | `/api/tracks`      | Create track        |
| PUT    | `/api/tracks/{id}` | Update track        |
| DELETE | `/api/tracks/{id}` | Delete track        |

### Videos
| Method | Route              | Description         |
|--------|--------------------|---------------------|
| GET    | `/api/videos`      | All published videos (paginated) |
| GET    | `/api/videos/{id}` | Single video        |
| POST   | `/api/videos`      | Create video        |
| PUT    | `/api/videos/{id}` | Update video        |
| DELETE | `/api/videos/{id}` | Delete video        |

### Team
| Method | Route       | Description                            |
|--------|-------------|----------------------------------------|
| GET    | `/api/team` | All active team members (by display order) |

All list endpoints support pagination: `?page=1&pageSize=10`

Response shape:
```json
{
  "data": [...],
  "totalCount": 5,
  "page": 1,
  "pageSize": 10
}
```

---

## Environment Configuration

### Backend — `appsettings.json`
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "<your-postgres-connection-string>"
  },
  "AllowedOrigins": {
    "Vercel": "https://your-project.vercel.app"
  }
}
```

### Frontend — `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

For production, set `NEXT_PUBLIC_API_URL` to your deployed backend URL in the Vercel project settings.

---

## Deploying to Vercel

1. Push the `frontend/` directory to a GitHub repo (or the monorepo root with `frontend/` as the root directory).
2. In Vercel: set **Root Directory** to `frontend`.
3. Add environment variable `NEXT_PUBLIC_API_URL` pointing to your production API.
4. Update `AllowedOrigins.Vercel` in the backend `appsettings.json` to match your Vercel domain.

---

## Seed Data

The database is seeded automatically on first migration with:
- **5 articles** — tech and culture topics (Marcus Osei, Priya Nair)
- **4 music tracks** — ambient/lo-fi by Aurelius Kane
- **3 videos** — behind-the-scenes, music visual, interview
- **4 team members** — Lead Developer, Content Lead, Music Producer, Video Director
