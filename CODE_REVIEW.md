# Code Review — SoundCrit / Content Platform

Deep review of all three apps in this monorepo (`backend/`, `frontend/`, `mobile/`), covering
architectural flaws and warning cleanup.

**Date:** 2026-08-15
**Scope:** ~160 source files (37 C#, 57 frontend TS/TSX, 66 mobile TS/TSX)

---

## Summary

| Project | Warnings before | Warnings after | Files changed |
|---|---|---|---|
| `backend/` | 0 (already clean) | 0 | 9 |
| `frontend/` | **34** (27 errors, 7 warnings) | **0** | 12 + 1 new |
| `mobile/` | **1** (expo-doctor) | **0** | 2 |

Verification after changes:

- `backend`: `dotnet build --no-incremental` → **Build succeeded, 0 Warning(s), 0 Error(s)**
- `frontend`: `eslint` → clean · `tsc --noEmit` → clean · `next build` → succeeds, all 19 routes
- `mobile`: `tsc --noEmit` → clean · `expo-doctor` → **18/18 checks passed**

Nothing has been committed or pushed — all changes are in the working tree.

---

## Part 1 — Bugs fixed

### Critical: any signed-in user could edit or delete anyone's track

`backend/Controllers/TracksController.cs` — `Update` and `Delete` carried `[Authorize]` and no
ownership check. `[Authorize]` only proves *some* account is calling; it says nothing about *which*.
So any registered user could `PUT /api/tracks/{id}` over another artist's track — retitling it,
repointing `audioUrl`, unpublishing it — or `DELETE` it outright.

`Update` was clearly aware of tampering (it already restored `ArtistId` from the stored row to stop
ownership reassignment), but never checked the caller against that owner.

**Fixed:** both now load the existing row and `Forbid()` unless `ArtistId` matches the caller.
`Update` additionally restores `PlayCount` from the database so a client payload can't rewrite it.

`IsFeatured` and `IsPublished` were deliberately left client-settable — both clients expose them as
artist-facing toggles in the studio UI (`my-music/page.tsx`, `TrackFormScreen.tsx`), so locking them
down would have broken a real feature.

### Critical: anonymous session comments were not anonymous

`backend/Controllers/EventCommentsController.cs` + `DTOs/EventDTOs.cs` — `EventCommentDto` carries
both `IsAnonymous` and the real `UserId`. `GetByTrack` and the SignalR `NewComment` broadcast both
emitted the true `UserId` next to `DisplayName: "Anonymous"`.

The anonymity was cosmetic: anyone reading the API response — or listening on the hub — could unmask
every anonymous comment in a session. This is the kind of feature people rely on when giving honest
feedback on someone's music, so the gap matters.

**Fixed:** `UserId` is emitted as `""` whenever `IsAnonymous` is set, in both the list endpoint and
the broadcast DTO. The column is still stored, so moderation/abuse handling remains possible
server-side. Verified no client reads `userId` on event comments, so nothing breaks.

### High: cross-session IDOR on submissions and join requests

Three endpoints looked up a child row by primary key and never checked it belonged to the event in
the route:

- `EventTracksController.UpdateStatus` — `_db.EventTracks.FindAsync(trackId)`
- `EventTracksController.Delete` — same
- `EventRequestsController.UpdateStatus` — `_db.EventRequests.FindAsync(requestId)`

Each verified `ev.HostId == userId` for the event *in the URL*, then acted on a row that could belong
to a completely different event. So the host of any session could approve, reject, reorder or delete
submissions in someone else's session, and approve join requests there.

**Fixed:** all three now query with both the id and `EventId`, so an out-of-scope id returns 404.

### High: you could submit someone else's track to a session

`EventTracksController.Submit` accepted any `body.TrackId` from an approved participant, with no
check that the track belonged to them — including another artist's unpublished work.

**Fixed:** the track is loaded and `Forbid()` returned unless `track.ArtistId` is the caller. This
matches the UI, which only ever offers the user's own tracks.

### High: a malformed or long track duration stalled a live session forever

`backend/Services/EventScheduler.cs` — `ParseDurationToSeconds` only understood `"m:ss"` and returned
`0` for anything else. The advance check was `elapsed >= durationSeconds && durationSeconds > 0`, so a
`0` meant the condition could never fire: the scheduler sat on that track indefinitely and the
session never advanced or ended.

Any track of an hour or more (`"1:02:33"` → 3 parts → `0`) hit this, as did any empty or malformed
duration string. Given `Duration` is populated by TagLib at upload and stored as a plain string, a
bad read was entirely reachable.

**Fixed:** the parser accepts `ss`, `m:ss` and `h:mm:ss`, and falls back to a 210-second default
rather than `0` when a duration is unreadable. The `durationSeconds > 0` guard was dropped since it
can no longer be zero. A stuck session now moves on instead of hanging.

### High: hub signals were sent before the database commit

`backend/Services/EventScheduler.cs` — the start-of-event path had an explicit comment:

> `// Save BEFORE sending signals so router.refresh() sees the updated status`

…but the much larger advance loop below it did the opposite: `TrackChanged`, `CountdownStarted` and
`EventEnded` were all sent inline while `SaveChangesAsync()` ran only at the end of the tick.

A client that received `TrackChanged` and immediately called `GET /events/{id}/sync` — exactly what
both clients do — could read the *previous* `CurrentTrackIndex` and seek to the wrong position in the
wrong track. That undermines the whole point of a server-authoritative clock.

**Fixed:** signals are queued during the loop and flushed after `SaveChangesAsync()`, so the advance
path now matches the discipline the start path already documented. `ProcessUploadToProfile` likewise
runs after the commit instead of interleaving its own save mid-loop.

### Medium: play counts were silently lost under concurrency

`TracksController.IncrementPlay` did read-modify-write (`track.PlayCount++` then save). Concurrent
listeners each wrote back a value read before the others' increments, so plays vanished — directly
degrading the `/charted` feature that ranks on this column.

**Fixed:** replaced with an atomic `ExecuteUpdateAsync(... PlayCount + 1)`.

### Medium: albums never loaded on the web "My Music" page

`frontend/app/my-music/page.tsx`:

```js
const loadAlbums = useCallback(async () => {
  try { setAlbums(await getMyAlbums(token!)); } catch {}
}, []);   // ← empty deps
```

The empty dependency array froze `token` at its first-render value, which is `null` (AuthContext
resolves asynchronously). The `token!` non-null assertion silenced the type error, the request went
out unauthenticated, and the empty `catch {}` swallowed the 401 — so the albums list just stayed
empty with no error anywhere. The effect below re-ran when the token arrived, but `loadAlbums` had a
stable identity, so it kept calling the stale closure.

This is what the `react-hooks/exhaustive-deps` warning on that line was pointing at.

**Fixed:** `loadAlbums` now depends on `token` and guards on it like its sibling `loadTracks`. The
initial load was moved into a single cancellable `Promise.all` in the effect.

### Medium: host edits to a session mutated a prop instead of state

`frontend/app/events/[id]/EventUpcoming.tsx` assigned straight onto the `event` prop:

```js
event.coverImageUrl = url;
event.scheduledAt = utc;
```

Mutating a prop tells React nothing changed. The cover appeared to work only because `setCoverUrl`
happened to trigger a re-render alongside it; the reschedule case relied on the same coincidence to
refresh `<BigCountdown>`.

**Fixed:** both are real state now (`coverUrl`, `scheduledAt`), and the countdown and date editor read
from state. This is what the two `react-hooks/immutability` errors were flagging.

### Medium: mobile could not replay a finished track

`mobile/lib/AudioPlayerContext.tsx` — the load effect de-dupes on `lastTrackId`, so re-selecting the
already-loaded track early-returned and did nothing. After a track ran to the end, tapping it again
was a no-op.

**Fixed:** `playTrack` detects re-selection of the current track and restarts it via `seekTo(0)` +
`play()` instead of falling through to the effect.

### Medium: a brief network blip signed users out

Both `frontend/contexts/AuthContext.tsx` and `mobile/contexts/AuthContext.tsx` restore the session by
calling `/api/auth/me` and discarding the stored token in a blanket `catch`. That catch also fires on
DNS failure, timeout, offline, and any 5xx — so a momentary connectivity problem permanently logged
the user out.

**Fixed on web:** the token is now only discarded on a definitive `401`/`403`. Other failures leave it
in place to retry on next load.

**Not yet fixed on mobile** — see *Not changed* below.

### Medium: crossfade ran side effects inside a state updater

`frontend/app/tracks/[id]/StorySection.tsx` called `setImgB(...)`/`setImgA(...)` from inside a
`setTop(prev => ...)` updater. React may invoke updaters more than once (StrictMode, concurrent
rendering), which would double-swap the layers.

**Fixed:** the A/B layers are one atomic `layers` state object updated in a single idempotent
transition, derived during render rather than in an effect.

### Low: relative time labels used the server's timezone

`app/page.tsx` and `app/events/page.tsx` each had a local `EventTimeLabel` computing
`Date.now()` during render of an async server component — so "Today" / "Tomorrow" / "This Week" were
bucketed against the *server's* clock and timezone, not the viewer's.

**Fixed:** extracted to one shared client component, `frontend/components/EventTimeLabel.tsx`, which
computes buckets on the client and refreshes each minute. `Live`/`Ended` still render server-side
since they don't depend on the clock. This also removes the duplicate implementation and resolves the
two `react-hooks/purity` errors.

### Low: `/sync` over-fetched on the hottest endpoint

`EventSyncController.Sync` eagerly loaded `EventTracks` → `Track` for the whole lineup and used none
of it — it only reads four scalar playback fields. This endpoint is polled every ~5s by every
listener in every live session.

**Fixed:** projected to just the fields it uses.

### Low: assorted correctness

- **`AuthController.GetPublicProfile`** — the display-name fallback used a synchronous
  `FirstOrDefault` on the DbSet inside an async action, blocking a request thread on database I/O.
  Now `FirstOrDefaultAsync`.
- **`JwtService`** — `double.Parse(...)` without a culture reads `"7.5"` against the host locale; a
  server under a comma-decimal culture would throw at login. Now `CultureInfo.InvariantCulture`.
- **`Program.cs`** — a missing `Jwt:Key` surfaced as a `NullReferenceException` from inside the token
  handler at first login; now fails fast at startup with a clear message.
- **`Program.cs`** — removed a dead scope block that resolved `AppDbContext` and did nothing with it
  (leftover from the commented-out auto-migrate), replaced with a note on how to apply migrations.
- **`TracksController`** — `pageSize` was unbounded, so `?pageSize=1000000` would pull the whole
  catalogue into memory. Clamped to 100 (the maximum any client actually requests) and `page` to ≥1.
- **`EventEnded.tsx`** — switching tracks quickly could land a slow comment response on top of a
  newer selection. The fetch is now a cancellable effect keyed on the selected track.
- **`useEventHub.ts`** — removed four `console.log` calls that fired on every hub event, and added a
  missing `.catch()` on the reconnect `JoinEvent` invoke.

---

## Part 2 — Warning cleanup

### Frontend: 34 → 0

The 27 errors were mostly the new React Compiler-era `react-hooks` rules that ship with Next.js 16.
These are not cosmetic — each one marks a pattern that breaks under the React Compiler or concurrent
rendering. Fixes by rule:

| Rule | Count | How it was resolved |
|---|---|---|
| `react-hooks/refs` | 7 | Replaced the "latest ref" pattern with **`useEffectEvent`** (React 19.2, and the replacement the Next 16 upgrade guide points to). Also converted a drag ref read during render into state. |
| `react-hooks/set-state-in-effect` | 8 | Restructured so state updates happen in async continuations, or derived during render via React's documented "adjust state when props change" pattern. |
| `react-hooks/immutability` | 4 | Removed two prop mutations (real bug, above) and two temporal-dead-zone reads of `const`s declared further down the component. |
| `react/no-unescaped-entities` | 6 | `&apos;` / `&ldquo;` / `&rdquo;`. |
| `react-hooks/purity` | 2 | `Date.now()` during render → shared client component (real bug, above). |
| `@typescript-eslint/no-unused-vars` | 4 | Removed unused `Image` import, unused `router`, and unused `isPlaying`/`setIsPlaying` destructuring. |
| `react-hooks/exhaustive-deps` | 3 | Added the genuinely missing deps (one was the My Music bug above). |

Per the repo's `frontend/AGENTS.md` warning about Next.js 16 differing from training data, I checked
`node_modules/next/dist/docs/` and confirmed `useEffectEvent` is the sanctioned replacement here
rather than assuming an older pattern.

Notable: `useEventHub` gained an `onEventEnded` callback so `EventLive` reacts to the hub signal
directly, instead of mirroring hub state into local state and then reacting to it in an effect.

### Mobile: 1 → 0

`expo-doctor` reported a missing peer dependency: **`expo-asset`, required by `expo-audio`**, with the
note *"Your app may crash outside of Expo Go without this dependency."* Since audio playback is the
core of this product, that's a real release-build crash risk that wouldn't show up in Expo Go.

**Fixed:** `npx expo install expo-asset` → `~12.0.13`. Now 18/18 checks pass.

Mobile has **no ESLint configuration at all** — `tsc` is its only static check, and it was already
clean. See recommendations below.

### Backend: already 0

`dotnet build --no-incremental` reports no warnings, with `<Nullable>enable</Nullable>` and warning
level 10. The earlier "0 Warning(s)" from an up-to-date incremental build was not meaningful, so I
forced a full rebuild to confirm. Still clean after all changes.

---

## Part 3 — Architectural findings *not* changed

These need a schema migration, a product decision, or infrastructure work, so I've documented rather
than acted on them.

### 1. `Album` has no owner column — authorization can't be expressed — **RESOLVED**

> **Fixed after this review was written.** `Album.ArtistId` was added
> (migration `20260815213709_AddAlbumArtistId`, with a backfill from each album's lowest-numbered
> track), and ownership checks were applied to all six mutating endpoints. Albums that could not be
> attributed remain `NULL` and are treated as unowned. The original finding is kept below for
> context.


`AlbumsController` has **zero ownership checks** across `Create`, `Update`, `Delete`, `AddTrack`,
`RemoveTrack` and `ReorderTracks`. Any authenticated user can edit or delete any album and rearrange
its tracks.

This is the same class of bug as the track one I fixed, but it can't be fixed the same way: the
`Album` entity has **no `ArtistId`/`OwnerId` field at all**. Ownership is only inferrable through
`TrackAlbums → Track.ArtistId`, which is both expensive and ambiguous for an album spanning multiple
artists — and completely undefined for an empty album.

**Recommendation:** add `Album.ArtistId` with a migration, backfill from the first track's artist,
then apply the same checks used in `TracksController`. I did not do this because it requires a schema
migration and a backfill decision that's yours to make.

### 2. `EventScheduler` assumes exactly one backend instance

The scheduler is a `BackgroundService` registered in every process, with no leader election,
distributed lock, or optimistic-concurrency token on `Event`. Scale the API to two replicas and both
tick every 5 seconds over the same rows — double-advancing tracks and racing writes to
`CurrentTrackIndex`.

Given this is the product's headline feature, it's worth deciding deliberately. Options: a
`SELECT … FOR UPDATE SKIP LOCKED` claim per tick, a Postgres advisory lock, adding a
`[ConcurrencyCheck]` rowversion to `Event`, or running the scheduler as a separate single-instance
worker.

### 3. `GetById` leaks the full submission queue publicly

`EventsController.GetById` returns `result.Tracks` — **all** event tracks with their `Status` and
submitter `UserId` — to anonymous callers. Meanwhile `EventTracksController.GetAll` carefully
restricts non-hosts to only their own submissions.

So the careful authorization in one endpoint is undone by the other: pending and rejected submissions,
and who made them, are publicly readable. Fixing it means filtering to `Approved` for non-hosts,
which changes the shape clients receive — worth confirming against the studio UI before changing.

### 4. Login has no brute-force protection

`AuthController.Login` uses `_userManager.CheckPasswordAsync`, which does **not** increment the
access-failed count, so ASP.NET Identity's lockout never engages regardless of configuration. There's
also no rate limiting on `login`, `register`, `forgot-password`, or `/api/tracks/{id}/play`.

**Recommendation:** switch to `SignInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true)`
and add ASP.NET's rate limiter on the auth endpoints. I left this alone because enabling lockout
changes real login behavior and deserves an explicit decision.

Related: `Login` returns early when the email is unknown, without hashing — a timing oracle for user
enumeration, partially undoing the care taken in `ForgotPassword` to avoid exactly that.

### 5. Email verification is not enforced

`Register` issues a JWT immediately and `Login` never checks `EmailConfirmed`, so the whole
verification flow is decorative — an unverified account has identical access. Either enforce it or
drop the flow; as-is it implies a guarantee that doesn't hold.

### 6. JWTs are long-lived and cannot be revoked

Tokens carry no `SecurityStamp`, and expiry is configured in **days** with no refresh-token flow.
Changing a password or logging out does not invalidate outstanding tokens — logout is purely
client-side. A leaked token stays valid until it expires.

### 7. CORS allows every `*.vercel.app` origin with credentials

`Program.cs` allows any `*.vercel.app` host together with `AllowCredentials()`. That's not just your
previews — it's every Vercel deployment by anyone. Worth pinning to the specific preview project.
(`WithExposedHeaders("*")` is also not a valid wildcard in credentialed mode.)

Also: `UseSwagger()`/`UseSwaggerUI()` are registered unconditionally, publishing the full API surface
in production, and there's no `UseHttpsRedirection()`.

### 8. Uploads are unbounded and unvalidated

`UploadController` enforces no size limit and no content-type allowlist on either endpoint. The audio
path reads the entire file into a `MemoryStream` and then `ToArray()`s it — two full copies in memory
per upload. `file.ContentType` is attacker-controlled and passed straight into
`MediaTypeHeaderValue`, where a malformed value throws and surfaces as a 500.

### 9. Client-side playback clock drifts away from the server

Both clients track elapsed time with a local `setInterval(… + 1, 1000)` and only reconcile against
`/sync` on mount and every 5s (web) — while comment timestamps are derived from that drifting local
counter. Background tabs throttle timers heavily, so timestamps can land seconds off the true
position. Since the server is designed as the single clock, elapsed time would be better *derived*
from `serverTime - currentTrackStartedAt` on each tick rather than counted locally.

Relatedly, `EventLive.tsx` seeks with `setTimeout(() => seekTo(...), 100)` — an arbitrary race against
audio load. `loadedmetadata` would be deterministic.

### 10. Dead preload path in `EventLive.tsx`

The effect that builds `new Audio()` during a countdown assigns `preloadRef.current` and nothing ever
reads it. The preloaded element is never handed to the player, so it just downloads each track a
second time. Either wire it into `AudioPlayerContext` or delete it — I left it in place because
removing it is a behavioral judgment call about whether preloading is still wanted.

### 11. Mobile `AuthContext` has the same sign-out-on-network-blip bug

Same issue as item under *Bugs fixed*, but I did not change it: mobile has **no lint or test
coverage**, and offline behavior matters much more on a phone, so this deserves testing on a device
rather than a blind edit. The fix mirrors the web one — only delete the stored token on a definitive
401/403.

### 12. Silent error swallowing throughout

`catch {}` / `.catch(() => {})` appears extensively in both clients (4 bare `catch {}` in mobile
alone). The My Music albums bug above was invisible for exactly this reason — the request failed on
every page load and nothing surfaced anywhere. Worth at least logging in development.

---

## Housekeeping

- ~~**`mobile/` is untracked in git.**~~ **Resolved** — the mobile app was added to the monorepo in
  `936c417`, including the `expo-asset` fix from this review.
- **`mobile/` has no ESLint config.** Given the frontend's 27 errors were nearly all real React
  correctness issues, and mobile shares the same patterns and authors, adding `eslint-config-expo`
  would likely surface a comparable set. I did not add it here — introducing a linter mid-review
  would have generated a fresh backlog rather than clearing the existing one.
- **`README.md` is stale** — it describes an older "articles/videos" product and doesn't mention
  `mobile/`. `PROJECT_OVERVIEW.md` (also untracked) is accurate; consider replacing the README.
- **`mobile/AGENTS.md` points at Expo SDK 57 docs but SDK 54 is installed.**
