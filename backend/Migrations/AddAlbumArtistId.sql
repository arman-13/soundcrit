-- Migration: AddAlbumArtistId  (20260815213709)
-- Adds an owner column to Albums so album authorization can be expressed.
--
-- Apply this BEFORE deploying the matching backend code: AlbumsController now
-- queries "Albums"."ArtistId" directly and will error if the column is absent.
--
-- Paste the whole block into your SQL editor and run it as one statement batch.
-- It is wrapped in a transaction, so it either fully applies or fully rolls back.

BEGIN;

-- 1. The owner column. Nullable: albums with no tracks have nothing to infer an
--    owner from, and are treated as unowned (nobody can edit them) until set.
ALTER TABLE "Albums" ADD COLUMN "ArtistId" text;

-- 2. Index it — every "my albums" lookup filters on this column.
CREATE INDEX "IX_Albums_ArtistId" ON "Albums" ("ArtistId");

-- 3. Backfill. There was never an owner field, so the only evidence of who owns
--    an album is the artist behind its tracks: take the lowest-numbered track's
--    artist. Albums spanning multiple artists resolve to the first track's.
UPDATE "Albums" AS a
SET "ArtistId" = sub."ArtistId"
FROM (
    SELECT DISTINCT ON (ta."AlbumId")
           ta."AlbumId",
           t."ArtistId"
    FROM "TrackAlbums" AS ta
    JOIN "Tracks" AS t ON t."Id" = ta."TrackId"
    WHERE t."ArtistId" IS NOT NULL
    ORDER BY ta."AlbumId", ta."TrackNumber", ta."TrackId"
) AS sub
WHERE a."Id" = sub."AlbumId"
  AND a."ArtistId" IS NULL;

-- 4. Record the migration as applied. DO NOT SKIP THIS — without it EF Core has
--    no idea the schema changed, and the next `dotnet ef database update` will
--    try to add the same column again and fail.
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260815213709_AddAlbumArtistId', '10.0.0');

COMMIT;


-- ─────────────────────────────────────────────────────────────────────────────
-- AFTERWARDS: find albums the backfill could not attribute.
-- A NULL owner means nobody can edit that album, including you.
--
--   SELECT "Id", "Title", "IsPublished" FROM "Albums" WHERE "ArtistId" IS NULL;
--
-- Claim any that come back (substitute your username):
--
--   UPDATE "Albums"
--   SET "ArtistId" = (SELECT "Id" FROM "AspNetUsers" WHERE "UserName" = 'your-username')
--   WHERE "ArtistId" IS NULL;
-- ─────────────────────────────────────────────────────────────────────────────
