# SoundCrit / Content Platform — Project Overview

Generated as a full reference doc so future conversations don't need to re-derive this from scratch.
This is a **monorepo with three apps** sharing one backend: `backend/` (API), `frontend/` (web), `mobile/` (iOS/Android app).

The product is a music-sharing platform ("SoundCrit") — artists post tracks/albums, people comment on them,
and the standout feature is **Sessions**: scheduled synchronized "listening party" live streams where everyone
hears the same track at the same timestamp, server-driven, with live per-track comments.

> Note: the repo's own `README.md` is stale (describes an older "articles/videos" version of the app and doesn't
> mention `mobile/` at all). Treat this document and the actual code as the source of truth instead.

---

## 1. Backend (`backend/`)

**Stack:** ASP.NET Core, **.NET 10**, C#, Entity Framework Core 10 (code-first), PostgreSQL via Npgsql,
ASP.NET Identity (auth), JWT bearer tokens, SignalR (real-time), Cloudinary (image/audio uploads),
Resend (transactional email), Swashbuckle (Swagger/OpenAPI), TagLibSharp (reading audio file metadata on upload).

**Entry point:** `Program.cs` — minimal-hosting style, all service wiring inline (no separate `Startup.cs`).

### Structure
```
backend/
├── Controllers/     one controller per resource (see below)
├── Models/          EF Core entities
├── DTOs/            request/response shapes (Albums, Auth, Comments, Events, PagedResponse<T>)
├── Data/            AppDbContext
├── Services/        EmailService, EventScheduler, JwtService
├── Hubs/            EventHub (SignalR)
├── Infrastructure/  UtcDateTimeConverter (forces all DateTimes to UTC over JSON)
├── Migrations/       17 EF Core migrations so far
└── Program.cs
```

### Domain model
- **Track** — a song: title, artist, audioUrl, coverImageUrl, duration, genre, playCount, isFeatured, story/description fields.
- **Album**, **TrackAlbum** — album groups tracks (many-to-many join).
- **Comment** — track comments, optionally timestamped to a point in the song (`songTimestamp`).
- **AlbumComment** — separate comment thread scoped to an album (not per-track).
- **Event** — a "Session": `Title`, `Status` (`Upcoming` / `Live` / `Ended`), `ScheduledAt`, `HostId`,
  plus **server-authoritative playback state**: `CurrentTrackIndex`, `CurrentTrackStartedAt`, `CountdownStartedAt`.
- **EventTrack** — a track submitted into a session's lineup, with an approval `Status` (only `Approved` tracks play).
- **EventComment** — comments scoped to one track *within* one event (separate from regular track comments),
  supports `IsAnonymous` and `TrackTimestamp`.
- **EventRequest** — a request to join/submit to an event, with its own approval status.
- **Follow** — user-follows-user.
- **ApplicationUser** — extends ASP.NET Identity's user with displayName, bio, avatarUrl, username.
- **TeamMember** — static "about the team" content.

### Controllers (= REST surface)
`AuthController`, `TracksController`, `AlbumsController`, `CommentsController`, `AlbumCommentsController`,
`EventsController`, `EventTracksController`, `EventCommentsController`, `EventRequestsController`,
`EventSyncController`, `FollowController`, `TeamController`, `UploadController`.

### The Sessions/live-sync architecture (the interesting part)
This is a **server-driven synchronized playback** system, not peer-to-peer and not client-scheduled:

1. `EventScheduler` (`Services/EventScheduler.cs`) is a `BackgroundService` that ticks every **5 seconds**.
   It walks all `Live`/about-to-start events, and based on elapsed time vs. each approved track's duration,
   advances `Event.CurrentTrackIndex` / `CurrentTrackStartedAt` server-side — i.e. **the server is the single
   clock**, not any one listener's device.
2. `EventHub` (SignalR, mounted at `/hubs/event`) lets clients `JoinEvent(eventId)` / `LeaveEvent(eventId)` to
   join a per-event group, then receive push updates as the scheduler advances tracks.
3. `EventSyncController` exposes a **pull-based fallback** (`GET /api/events/{id}/sync`) returning
   `{status, currentTrackIndex, elapsedSeconds, countdownSeconds, serverTime}` so a client can compute exactly
   where in the current track it should seek to on join/reconnect, independent of the push channel.
4. Once an event ends, it becomes browsable exactly like a podcast episode: the approved tracks are just listed,
   in `Order`, each with its own `EventComment` thread — this is the "Past Session" view.

### Auth
- ASP.NET Identity + JWT bearer. Login/register issue a JWT (`JwtService`); `[Authorize]` on protected endpoints.
- CORS is locked to `localhost`, `*.vercel.app`, and `soundcrit.com`/`www.soundcrit.com`.

### Uploads
`UploadController` + `CloudinaryDotNet` handle image/audio upload, returning a hosted URL (`res.cloudinary.com/...`)
that gets stored on the entity (`coverImageUrl`, `audioUrl`, `avatarUrl`, etc). `TagLibSharp` reads duration/metadata
off uploaded audio files server-side.

### Migrations
EF Core code-first migrations under `Migrations/`. `Program.cs` has an auto-migrate line **commented out**
(`// db.Database.Migrate();`) — migrations are applied manually/deliberately, not on every boot.

---

## 2. Frontend (`frontend/`) — the web app

**Stack:** **Next.js 16** (App Router), **React 19**, TypeScript, Tailwind CSS 4, `@microsoft/signalr` client.

> `frontend/AGENTS.md` explicitly warns: *"This is NOT the Next.js you know — breaking API/convention changes vs.
> training data. Read `node_modules/next/dist/docs/` before writing code."* Treat Next.js 16 as unfamiliar territory,
> don't assume Next 13/14 patterns apply.

### Structure (App Router)
```
frontend/app/
├── page.tsx                    Home
├── music/                      Browse all tracks
├── albums/ , albums/[id]/      Album list + detail (+ AlbumComments, AlbumTrackList)
├── artists/[username]/         Artist profile (+ ArtistTracks, FollowButton)
├── tracks/[id]/                Track detail (+ Comments, TrackDetailPlayer, StorySection, BackButton)
├── charted/                    Top-played tracks
├── events/ , events/[id]/      Sessions list + detail — detail branches by status:
│   ├── EventUpcoming.tsx           countdown, not started
│   ├── EventLive.tsx               synced live playback via useEventHub
│   ├── EventEndingScreen.tsx       transitional "wrapping up" state
│   └── EventEnded.tsx              browsable lineup + per-track inline comments (see below)
├── my-events/ , my-music/       Creator-facing management (StoryBlockEditor for track "story" content)
├── login/ , register/ , forgot-password/ , reset-password/ , verify-email/
├── profile/ , about/
└── layout.tsx, globals.css
```
`components/` holds cross-page UI: `Header`, `Footer`, `AudioPlayer`, `TrackCard`, `ChartedRow`, `EventCardCover`,
`PasswordInput`, `AutoRefresh`, `BackButton`.
`lib/AudioPlayerContext.tsx` — global audio player state (current track, queue, play/pause, seek) via React context,
backed by an actual `<audio>` element (`audioRef`).
`lib/api.ts` — typed fetch wrapper + one exported function per backend endpoint.
`contexts/AuthContext.tsx` — session/user state, mirrors the backend's JWT auth.
`hooks/useEventHub.ts` — wraps the SignalR connection lifecycle (join/leave event groups, subscribe to pushes)
for the live Sessions feature.

### Key pattern: `EventEnded.tsx` (important — mobile explicitly mirrors this)
Clicking a track in a session's lineup does **not** navigate to the track's own page. It sets `selectedTrack`
local state, lazily fetches that track's `EventComment`s (`getEventComments(eventId, eventTrackId)`), and renders
an inline "now viewing" panel + comment thread + composer beside the list — a two-column layout (list left,
comments right) that collapses to stacked on mobile widths. This exact interaction was ported to the mobile app
(see §3) after it was initially built as "tap track → navigate to track detail," which was wrong.

### Styling
Tailwind CSS 4 utility classes directly in JSX, dark theme, no component library — same visual language as mobile
(off-black backgrounds, translucent-white text at varying opacities for hierarchy, thin white/10 borders).

---

## 3. Mobile (`mobile/`) — the iOS/Android app

**Stack:** **Expo SDK 54**, **expo-router ~6.0.24** (file-based routing), React Native 0.81.5, React 19.1,
TypeScript, **NativeWind 4** (Tailwind classes on RN components via `className`), `expo-audio` (playback),
`expo-image`, `expo-blur`, `expo-image-picker`, `expo-secure-store` (token storage), React Native Reanimated 4.

> `mobile/AGENTS.md` warns: *"Expo HAS CHANGED — read exact versioned docs at docs.expo.dev/versions/v57.0.0
> before writing code."* (Installed version is actually SDK 54, not 57 — treat that pointer as "verify against
> real docs for whatever's installed," not a literal version number; **always check `package.json` first**.)
> This warning was proven correct this session: guessing at expo-router navigation APIs from general knowledge
> caused several real bugs (see §5).

### Navigation architecture (rebuilt this session — this is the part worth understanding deeply)

The app uses a **three-tab structure where each tab owns its own independent navigation stack**, closely
mirroring how Instagram/Spotify-style apps work — not the simpler "one shared stack under a tab bar" pattern.

```
app/
├── _layout.tsx                 Root: fonts, AuthProvider, AudioPlayerProvider, Stack{ (tabs), login, register }
├── login.tsx, register.tsx     Presented as native modals, outside the tab/chrome system entirely
└── (tabs)/
    ├── _layout.tsx             Outer tab shell — see "Tab bar" below
    ├── (home)/                 Group folder (parens = invisible in URL) → tab root is "/"
    │   ├── _layout.tsx             Stack + TopBar(rootPath="/")
    │   ├── index.tsx                Home feed
    │   ├── music.tsx  → /music
    │   ├── charted.tsx → /charted
    │   ├── albums/index.tsx, albums/[id].tsx
    │   ├── tracks/[id].tsx
    │   └── artists/[username].tsx
    ├── sessions/                Real folder (NOT a group) → tab root is "/sessions"
    │   ├── _layout.tsx             Stack + TopBar(rootPath="/sessions")
    │   ├── index.tsx                Sessions list
    │   └── events/[id].tsx          "/sessions/events/[id]"
    └── profile/                 Real folder → tab root is "/profile"
        ├── _layout.tsx
        └── index.tsx
```

Each of `(home)`, `sessions`, `profile` has its **own nested `<Stack>`**, so drilling into Music → Track → Artist
while on the Home tab, then switching to Sessions and back, returns you to exactly where you left off in Home's
stack — real independent per-tab history, not a shared stack that resets.

**Shared screens across tabs:** `components/screens/*.tsx` (e.g. `TrackDetailScreen`, `AlbumDetailScreen`,
`ArtistProfileScreen`, `MusicScreen`, `AlbumsListScreen`, `ChartedScreen`, `EventDetailScreen`) hold the actual
screen logic. Route files under `app/` are thin re-exports (`export { default } from "@/components/screens/X"`).
This avoids duplicating logic while still letting a screen be registered at different route files if needed.

**Known tradeoff:** because `(home)` is a route *group* (bare paths like `/tracks/5`) but `sessions` and `profile`
are real directories (prefixed paths like `/sessions/events/5`), a shared screen's *internal* cross-links
(e.g. tapping an artist name from a track opened via Sessions) resolve to Home's copy of that route and will
switch the active tab to Home. This is intentional-for-now, not a bug — true per-tab isolation for every possible
deep link would require rewriting all internal navigation to be relative, which was judged not worth it yet.

### Tab bar + top bar: custom, not React Navigation's built-ins
Two deliberate architectural choices, both because the obvious/default approach didn't hold up:

1. **Tab bar** (`app/(tabs)/_layout.tsx`) uses **`Tabs`/`TabList`/`TabTrigger`/`TabSlot` from
   `expo-router/ui`** (the *headless* custom-tabs API), not the styled `<Tabs>` from `expo-router` itself.
   The styled version (React Navigation Bottom Tabs under the hood) does not correctly support "each tab has
   its own nested Stack + custom tab bar + working deep links" — it silently broke pathname sync and cold-start
   route resolution. `expo-router/ui` is the API actually designed for this combination.
   `TabButton` (in that file) is a `TabTriggerSlotProps`-typed component passed via `asChild` for full styling
   control. Tab switching must go through **`router.navigate(href)`**, not the raw `navigation.navigate(name)`
   from React Navigation — the raw call updates the visible screen but *not* expo-router's own pathname state,
   which caused a real bug (back button incorrectly appearing on tab roots).
2. **Mini player + tab bar are one persistent unit**, rendered as normal (non-absolute) flex children inside
   `<Tabs>` alongside `<TabSlot />` — `<Tabs><TabSlot /><MiniPlayer /><TabList>...</TabList></Tabs>`. Because
   `TabSlot` has `flexGrow: 1` by default, this naturally reserves the right amount of space with **no manual
   bottom-padding math needed** in `Screen.tsx` — an earlier version tried absolute-positioning + hardcoded
   height constants and it was strictly worse.
3. **Top bar** (`components/TopBar.tsx`) is a **custom component, not a native-stack header**. It's rendered
   once per tab-stack layout (not per-screen), so the "SOUNDCRITIC" wordmark never re-renders or slides during
   navigation — native headers animate per-screen by design, which is exactly what was *not* wanted. It shows a
   back chevron (calling `router.back()`) only when `usePathname() !== rootPath` for that tab, so the three tab
   roots never show a back button and every screen pushed on top of them does.

### State / data
- `contexts/AuthContext.tsx` — same shape as web's, backed by `lib/tokenStore.ts` (uses `expo-secure-store`
  instead of a cookie/localStorage).
- `lib/AudioPlayerContext.tsx` — global playback via `expo-audio`'s `createAudioPlayer`; exposes `currentTrack`,
  `queue`, `isPlaying`, `currentTime`, `duration`, `playTrack`, `playNext/Prev`, `seekTo`, `dismiss`, `setIsLive`.
  Mirrors web's `AudioPlayerContext` API shape closely (`playTrack(track, queue?)`, `seekTo(seconds)`, etc.) —
  useful when porting behavior from web, as was done for `EventDetailScreen`.
- `lib/api.ts` — same one-function-per-endpoint pattern as web's `lib/api.ts`, same `EXPO_PUBLIC_API_URL` env var
  pointed at the deployed backend (`https://api.soundcrit.com`) rather than localhost, so the app works off any
  network, not just this Mac's.

### Design system
`tailwind.config.js`: `bg` = `#0a0a0a` (near-black background), `player` = `#111111` (mini player surface),
custom `Geist` font family at four weights (Light/Regular/Medium/SemiBold) loaded via `expo-font` in root layout.
Visual language throughout: translucent white text (`text-white/90` down to `/20` for hierarchy), thin
`border-white/10` dividers, no filled buttons except primary CTAs (solid white bg, black text) — same system as
the web app, just NativeWind instead of Tailwind-on-web.

### Sessions feature on mobile — mirrors web's `EventEnded.tsx` exactly
`components/screens/EventDetailScreen.tsx`: tapping a track in the lineup **selects** it (loads its
`EventComment`s inline) instead of navigating to a track detail page — same UX as web, added this session after
the original mobile implementation incorrectly navigated away (a "not found" bug was actually this design
mismatch, not just a broken route). `postEventComment` was missing from mobile's `lib/api.ts` entirely and had
to be added to match web's.

---

## 4. Cross-cutting conventions (apply to both frontend and mobile)

- **One `lib/api.ts` function per backend endpoint**, thin typed `fetch` wrappers, no query-building abstraction
  or codegen — endpoints are added by hand on both clients when the backend gains a route.
- **Auth**: JWT in `Authorization: Bearer` header, stored client-side (`localStorage`/cookie-ish on web,
  `expo-secure-store` on mobile), `AuthContext` on both exposes the same `{user, token, loading, login, register,
  logout, updateProfile}` shape.
- **No global state library** (no Redux/Zustand/Jotai) — just React Context for the two things that are
  genuinely global (auth, audio player). Everything else is local `useState` + fetch-in-`useEffect` per screen.
- **Comments come in two flavors** that must not be confused: regular per-track `Comment` (optionally
  timestamped) vs. session-scoped `EventComment` (per event *and* per track-within-that-event, supports
  anonymous posting). Albums have their own separate `AlbumComment` thread too.
- **Dark-only design**, no light theme anywhere in either client.

---

## 5. Notable gotchas learned the hard way this session

- **Both `frontend/AGENTS.md` and `mobile/AGENTS.md` explicitly warn that training-data assumptions about
  Next.js and Expo are unreliable for this repo.** This was empirically confirmed: several real, time-costly
  bugs this session (silently-broken tab navigation, a cold-start "Unmatched Route" 404, comments not loading)
  all traced back to assuming a more "standard"/older expo-router pattern instead of checking the actual
  installed-version behavior first.
- **expo-router's plain `<Tabs>` (React Navigation Bottom Tabs) does not reliably support "custom tab bar +
  independent nested Stack per tab."** Use `expo-router/ui`'s headless `Tabs`/`TabList`/`TabTrigger`/`TabSlot`
  for that combination instead — it's a different, purpose-built API, not just a styling variant.
- **Renaming a route-group folder `(name)` → plain `name` changes every URL under it** (adds a real path
  segment) — every hardcoded absolute link into that subtree needs updating too. This caused the `/events/[id]`
  → `/sessions/events/[id]` breakage when `(sessions)` was un-grouped to fix an unrelated deep-link bug.
- **This Mac's disk fills up fast from Xcode's DerivedData** (~5–7 GB per native rebuild) — check `df -h /`
  before kicking off any iOS build; `~/Library/Developer/Xcode/DerivedData` and
  `~/Library/Developer/CoreSimulator/Caches` are the usual safe things to clear.
- **Dev builds on a physical iPhone need Metro live and reachable the whole time** (same wifi, Mac awake) —
  they don't embed the JS bundle. For a build that works standalone, use
  `npx expo run:ios --device --configuration Release`. With a **free** Apple ID (no paid Developer account),
  that install still expires after **7 days** (Apple's free-provisioning limit) and needs re-running periodically.
