CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;
CREATE TABLE "Articles" (
    "Id" INTEGER NOT NULL,
    "Title" TEXT NOT NULL,
    "Slug" TEXT NOT NULL,
    "Summary" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "CoverImageUrl" TEXT NOT NULL,
    "AuthorName" TEXT NOT NULL,
    "PublishedAt" timestamp with time zone NOT NULL,
    "Tags" TEXT NOT NULL,
    "IsPublished" INTEGER NOT NULL,
    CONSTRAINT "PK_Articles" PRIMARY KEY ("Id")
);

CREATE TABLE "TeamMembers" (
    "Id" INTEGER NOT NULL,
    "FullName" TEXT NOT NULL,
    "Role" TEXT NOT NULL,
    "Bio" TEXT NOT NULL,
    "AvatarUrl" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Phone" TEXT,
    "GitHub" TEXT,
    "LinkedIn" TEXT,
    "DisplayOrder" INTEGER NOT NULL,
    "IsActive" INTEGER NOT NULL,
    CONSTRAINT "PK_TeamMembers" PRIMARY KEY ("Id")
);

CREATE TABLE "Tracks" (
    "Id" INTEGER NOT NULL,
    "Title" TEXT NOT NULL,
    "AlbumTitle" TEXT NOT NULL,
    "Artist" TEXT NOT NULL,
    "Genre" TEXT NOT NULL,
    "Duration" TEXT NOT NULL,
    "CoverImageUrl" TEXT NOT NULL,
    "AudioUrl" TEXT NOT NULL,
    "PublishedAt" timestamp with time zone NOT NULL,
    "IsPublished" INTEGER NOT NULL,
    CONSTRAINT "PK_Tracks" PRIMARY KEY ("Id")
);

CREATE TABLE "Videos" (
    "Id" INTEGER NOT NULL,
    "Title" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "ThumbnailUrl" TEXT NOT NULL,
    "VideoUrl" TEXT NOT NULL,
    "Category" TEXT NOT NULL,
    "PublishedAt" timestamp with time zone NOT NULL,
    "IsPublished" INTEGER NOT NULL,
    CONSTRAINT "PK_Videos" PRIMARY KEY ("Id")
);

INSERT INTO "Articles" ("Id", "AuthorName", "Content", "CoverImageUrl", "IsPublished", "PublishedAt", "Slug", "Summary", "Tags", "Title")
VALUES (1, 'Marcus Osei', '<p>Edge computing isn''t new — but the urgency around it is. As AI inference demands real-time responses and bandwidth costs balloon, the industry is re-examining where compute actually needs to live.</p><p>The core argument is simple: latency is a first-class citizen. Whether it''s autonomous vehicles, factory floor sensors, or next-gen AR glasses, waiting 200ms for a cloud round-trip is not an option. Edge devices bring the model to the data, not the other way around.</p><h2>Architecture Patterns</h2><p>Modern edge deployments typically fall into three tiers: device-level inference (on-chip, tiny models), on-premise edge nodes (small servers, quantized models), and regional edge PoPs that offload non-latency-critical tasks upstream.</p><p>The challenge is orchestration. Kubernetes distributions like K3s and MicroK8s have made it easier to treat edge nodes as first-class cluster members, but observability across a sprawling edge topology remains a hard problem.</p><h2>What''s Actually Shipping</h2><p>NVIDIA''s Jetson platform, Qualcomm''s AI 100, and Apple''s Neural Engine are the hardware stories. On the software side, ONNX Runtime and TensorRT are the deployment formats of choice. The model optimization pipeline — quantization, pruning, distillation — is now a required skill for any ML team serious about edge.</p><p>The bottom line: edge computing is graduating from niche use case to core infrastructure discipline. Teams that treat it as an afterthought will feel it in production.</p>', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800', True, TIMESTAMPTZ '2026-05-15T00:00:00Z', 'rise-of-edge-computing', 'As AI workloads push further from the cloud, edge computing is having its moment. We dig into the architecture choices shaping the next wave of distributed systems.', 'infrastructure,edge,AI,distributed-systems', 'The Rise of Edge Computing: Why Latency Still Matters');
INSERT INTO "Articles" ("Id", "AuthorName", "Content", "CoverImageUrl", "IsPublished", "PublishedAt", "Slug", "Summary", "Tags", "Title")
VALUES (2, 'Priya Nair', '<p>There''s a particular kind of confidence in a design that does less. Not the laziness of an unfinished product, but the deliberate restraint of one that knows exactly what it is.</p><p>The minimalist turn in UI design isn''t purely aesthetic. It''s a response to a decade of notification badges, modal dialogs, and engagement-optimized dark patterns. Users are exhausted. The interfaces that cut through the noise are the ones that feel calm.</p><h2>Typography as Architecture</h2><p>When you strip away the decorative scaffolding, typography does the structural work. The choice between a humanist sans and a geometric one isn''t arbitrary — it sets the emotional register of the entire product. Editorial interfaces favor high contrast serif pairings. Utility tools lean toward neutral grotesques with generous line height.</p><h2>The Role of Whitespace</h2><p>Designers who haven''t internalized whitespace as an active element still treat it as emptiness. But whitespace is load-bearing. It creates hierarchy without color, guides attention without arrows, and communicates quality without words. The premium feel of high-end products is inseparable from their spatial generosity.</p><p>The challenge is shipping minimalist designs in organizations that measure engagement. When fewer elements means fewer clicks, product and design are often in tension. The teams that navigate this well treat calm interfaces as a retention strategy, not a sacrifice.</p>', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', True, TIMESTAMPTZ '2026-05-10T00:00:00Z', 'designing-for-silence', 'The best interfaces speak only when spoken to. A look at how restraint, whitespace, and typographic discipline are shaping the next generation of product design.', 'design,UI,typography,product', 'Designing for Silence: Minimalism in Modern UI');
INSERT INTO "Articles" ("Id", "AuthorName", "Content", "CoverImageUrl", "IsPublished", "PublishedAt", "Slug", "Summary", "Tags", "Title")
VALUES (3, 'Priya Nair', '<p>The node_modules folder is a monument to optimism. Thousands of packages, most maintained by one person on their evenings, underpinning software that companies depend on absolutely. The cracks show up in supply chain attacks, abandoned libraries, and the quiet burnout of maintainers who never asked to be critical infrastructure.</p><h2>The Dependency Audit Nobody Does</h2><p>Most teams don''t know what they''re actually running. A production service might carry 800 transitive dependencies, with no audit trail for when or why half of them arrived. Security teams are starting to demand Software Bills of Materials (SBOMs), but the practice is still far from standard.</p><h2>Maintainer Economics</h2><p>The open source funding model is broken in plain sight. The most critical packages in the ecosystem — the ones that would take down half the internet if they disappeared — are often maintained by people with day jobs who haven''t received a single sponsorship dollar. GitHub Sponsors and Open Collective exist, but adoption is thin. The xz backdoor incident in 2024 was a reminder of how easily social engineering fills the vacuum that funding could close.</p><h2>What Good Looks Like</h2><p>Thoughtful teams are adopting dependency hygiene as a practice: fewer dependencies, preference for dependencies with multiple active maintainers, and internal forks of critical libraries where necessary. It''s not about being anti-open-source — it''s about taking the relationship seriously.</p>', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800', True, TIMESTAMPTZ '2026-04-28T00:00:00Z', 'open-source-hidden-costs', 'Pulling in a npm package to handle a two-line task has become a reflex. But the economics of open source dependency are more complicated than they look.', 'open-source,security,engineering,culture', 'Open Source Isn''t Free: The Hidden Costs of Dependency Culture');
INSERT INTO "Articles" ("Id", "AuthorName", "Content", "CoverImageUrl", "IsPublished", "PublishedAt", "Slug", "Summary", "Tags", "Title")
VALUES (4, 'Priya Nair', '<p>The girl studying at a desk in the rain. The looping animation. The endless playlist. Lofi Girl''s YouTube channel became a cultural artifact almost by accident — a format that matched the texture of pandemic life so precisely it felt inevitable in retrospect.</p><p>But lo-fi hip hop didn''t invent ambient music. It inherited a lineage stretching from Brian Eno''s Ambient series through Japanese city pop, Nujabes, and J Dilla. What it did was make that lineage discoverable to a generation that processes life through screens.</p><h2>The Aesthetic as Infrastructure</h2><p>Lo-fi works because it''s designed to recede. The vinyl crackle, the dusty drums, the jazz chord voicings — these aren''t mistakes, they''re the point. The music creates a space rather than demanding attention. In an environment of constant notification and interruption, that''s genuinely useful.</p><h2>Community and Commerce</h2><p>What started as bedroom producers uploading to SoundCloud has become a micro-industry. Labels like Chillhop Music and College Music aggregate and license tracks, while individual artists build Patreon audiences and sync placements. The economics are modest but real — and the barrier to entry remains refreshingly low.</p>', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800', True, TIMESTAMPTZ '2026-04-18T00:00:00Z', 'lofi-ambient-music-internet', 'From YouTube study streams to curated Spotify playlists, lo-fi hip hop became the soundtrack of a generation. But the genre''s roots run deeper than the aesthetic.', 'music,culture,ambient,internet', 'Lo-Fi Isn''t Dead: How Ambient Music Found the Internet');
INSERT INTO "Articles" ("Id", "AuthorName", "Content", "CoverImageUrl", "IsPublished", "PublishedAt", "Slug", "Summary", "Tags", "Title")
VALUES (5, 'Marcus Osei', '<p>Every new project seems to arrive with a shopping list: Postgres for relational data, Redis for caching, Elasticsearch for search, Kafka for events. Sometimes that stack is the right call. Often it isn''t.</p><p>Postgres has quietly absorbed many of the use cases that used to require separate systems. The JSONB column type handles document storage. Full-text search with tsvector and GIN indexes covers the majority of search requirements. pg_notify enables lightweight pub/sub. Timescale extends it for time-series data. And partitioned tables handle append-only workloads that developers reflexively reach for Kafka to solve.</p><h2>The Hidden Cost of Polyglot Persistence</h2><p>Every datastore you add is an operational surface area you own. Separate backup schedules, different consistency guarantees, cross-system transactions you''ll need to implement yourself, and another thing for your on-call rotation to wake up for. The complexity budget is finite.</p><h2>When to Break Out</h2><p>This isn''t a manifesto. There are cases where a specialized store earns its keep: graph queries with hundreds of hops, sub-millisecond cache tiers with memory-only requirements, true high-throughput event streaming. But the threshold should be higher than most teams set it. Start with Postgres, measure the actual bottleneck, then add complexity only when the data proves you need it.</p>', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800', True, TIMESTAMPTZ '2026-04-05T00:00:00Z', 'postgres-for-everything', 'Developers keep reaching for specialized datastores when a well-tuned Postgres instance would do the job better. Here''s when to resist the urge to add another service.', 'databases,postgres,engineering,backend', 'Postgres for Everything: A Pragmatist''s Guide');

INSERT INTO "TeamMembers" ("Id", "AvatarUrl", "Bio", "DisplayOrder", "Email", "FullName", "GitHub", "IsActive", "LinkedIn", "Phone", "Role")
VALUES (1, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', 'Marcus architects the backend infrastructure and keeps the lights on. He''s been writing systems software for over a decade, with a particular obsession with distributed databases and performance profiling. When he''s not debugging queries at 2am, he''s writing about the engineering decisions that rarely make it into blog posts.', 1, 'marcus@collective.dev', 'Marcus Osei', 'https://github.com/marcosei', True, 'https://linkedin.com/in/marcosei', NULL, 'Lead Developer');
INSERT INTO "TeamMembers" ("Id", "AvatarUrl", "Bio", "DisplayOrder", "Email", "FullName", "GitHub", "IsActive", "LinkedIn", "Phone", "Role")
VALUES (2, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300', 'Priya shapes the editorial voice of everything we publish. She has a background in technology journalism and product, which means she can explain a distributed systems concept and a design philosophy with equal precision. She writes most of the long-form articles and edits everything else.', 2, 'priya@collective.dev', 'Priya Nair', NULL, True, 'https://linkedin.com/in/priyanair', NULL, 'Content Lead & Writer');
INSERT INTO "TeamMembers" ("Id", "AvatarUrl", "Bio", "DisplayOrder", "Email", "FullName", "GitHub", "IsActive", "LinkedIn", "Phone", "Role")
VALUES (3, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300', 'Aurelius produces all original music released on the platform under his own name and as collaborations. He works primarily in ambient, electronic, and lo-fi hip hop — drawing influences from Eno, Nujabes, and the broader experimental music tradition. His studio is a converted shed in east London.', 3, 'aurelius@collective.dev', 'Aurelius Kane', NULL, True, NULL, '+44 7700 900123', 'Music Producer');
INSERT INTO "TeamMembers" ("Id", "AvatarUrl", "Bio", "DisplayOrder", "Email", "FullName", "GitHub", "IsActive", "LinkedIn", "Phone", "Role")
VALUES (4, 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300', 'Sena handles everything that moves. She directs and edits all video content, from the studio tour series to music visuals. She has a background in documentary filmmaking and brings that sensibility to even the most technical subject matter — believing that the how you show something matters as much as what you''re showing.', 4, 'sena@collective.dev', 'Sena Adjei', NULL, True, 'https://linkedin.com/in/senaadjei', NULL, 'Video Director & Editor');

INSERT INTO "Tracks" ("Id", "AlbumTitle", "Artist", "AudioUrl", "CoverImageUrl", "Duration", "Genre", "IsPublished", "PublishedAt", "Title")
VALUES (1, 'Signal/Noise', 'Aurelius Kane', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', '4:22', 'Electronic / Ambient', True, TIMESTAMPTZ '2026-05-20T00:00:00Z', 'Midnight Frequencies');
INSERT INTO "Tracks" ("Id", "AlbumTitle", "Artist", "AudioUrl", "CoverImageUrl", "Duration", "Genre", "IsPublished", "PublishedAt", "Title")
VALUES (2, 'Urban Fossils', 'Aurelius Kane', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', '3:08', 'Lo-Fi Hip Hop', True, TIMESTAMPTZ '2026-05-12T00:00:00Z', 'Concrete Garden');
INSERT INTO "Tracks" ("Id", "AlbumTitle", "Artist", "AudioUrl", "CoverImageUrl", "Duration", "Genre", "IsPublished", "PublishedAt", "Title")
VALUES (3, 'Signal/Noise', 'Aurelius Kane', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400', '6:47', 'Ambient / Drone', True, TIMESTAMPTZ '2026-04-30T00:00:00Z', 'Solstice');
INSERT INTO "Tracks" ("Id", "AlbumTitle", "Artist", "AudioUrl", "CoverImageUrl", "Duration", "Genre", "IsPublished", "PublishedAt", "Title")
VALUES (4, 'Urban Fossils', 'Aurelius Kane', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400', '3:42', 'Lo-Fi Hip Hop', True, TIMESTAMPTZ '2026-04-15T00:00:00Z', 'Late Shift');

INSERT INTO "Videos" ("Id", "Category", "Description", "IsPublished", "PublishedAt", "ThumbnailUrl", "Title", "VideoUrl")
VALUES (1, 'Behind the Scenes', 'A behind-the-scenes look at how we record, edit, and ship content as a four-person remote team. Tour of our hardware, software stack, and the workflows we''ve iterated on.', True, TIMESTAMPTZ '2026-05-22T00:00:00Z', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800', 'Building in Public: Our Studio Setup', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
INSERT INTO "Videos" ("Id", "Category", "Description", "IsPublished", "PublishedAt", "ThumbnailUrl", "Title", "VideoUrl")
VALUES (2, 'Music Video', 'The complete Signal/Noise album accompanied by a generative visual piece created with TouchDesigner. Sixty minutes of ambient electronic music and reactive geometry.', True, TIMESTAMPTZ '2026-05-08T00:00:00Z', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', 'Signal/Noise — Full Album Visual', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
INSERT INTO "Videos" ("Id", "Category", "Description", "IsPublished", "PublishedAt", "ThumbnailUrl", "Title", "VideoUrl")
VALUES (3, 'Interview', 'We sat down with three independent creators to talk about platform risk, direct monetization, and what creative independence actually looks like in 2026.', True, TIMESTAMPTZ '2026-04-25T00:00:00Z', 'https://images.unsplash.com/photo-1478737270197-1af37015c5af?w=800', 'Conversation: The Future of Independent Media', 'https://www.youtube.com/embed/dQw4w9WgXcQ');

CREATE UNIQUE INDEX "IX_Articles_Slug" ON "Articles" ("Slug");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260601082843_InitialCreate', '10.0.0');

COMMIT;

START TRANSACTION;
DELETE FROM "Articles"
WHERE "Id" = 1;

DELETE FROM "Articles"
WHERE "Id" = 2;

DELETE FROM "Articles"
WHERE "Id" = 3;

DELETE FROM "Articles"
WHERE "Id" = 4;

DELETE FROM "Articles"
WHERE "Id" = 5;

DELETE FROM "TeamMembers"
WHERE "Id" = 1;

DELETE FROM "TeamMembers"
WHERE "Id" = 2;

DELETE FROM "TeamMembers"
WHERE "Id" = 3;

DELETE FROM "TeamMembers"
WHERE "Id" = 4;

DELETE FROM "Tracks"
WHERE "Id" = 1;

DELETE FROM "Tracks"
WHERE "Id" = 2;

DELETE FROM "Tracks"
WHERE "Id" = 3;

DELETE FROM "Tracks"
WHERE "Id" = 4;

DELETE FROM "Videos"
WHERE "Id" = 1;

DELETE FROM "Videos"
WHERE "Id" = 2;

DELETE FROM "Videos"
WHERE "Id" = 3;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260605110845_RemoveSeedData', '10.0.0');

COMMIT;

START TRANSACTION;
ALTER TABLE "Videos" ALTER COLUMN "VideoUrl" TYPE text;

ALTER TABLE "Videos" ALTER COLUMN "Title" TYPE text;

ALTER TABLE "Videos" ALTER COLUMN "ThumbnailUrl" TYPE text;

ALTER TABLE "Videos" ALTER COLUMN "PublishedAt" TYPE timestamp with time zone;

ALTER TABLE "Videos" ALTER COLUMN "IsPublished" TYPE boolean;

ALTER TABLE "Videos" ALTER COLUMN "Description" TYPE text;

ALTER TABLE "Videos" ALTER COLUMN "Category" TYPE text;

ALTER TABLE "Videos" ALTER COLUMN "Id" TYPE integer;
ALTER TABLE "Videos" ALTER COLUMN "Id" DROP DEFAULT;
ALTER TABLE "Videos" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "Tracks" ALTER COLUMN "Title" TYPE text;

ALTER TABLE "Tracks" ALTER COLUMN "PublishedAt" TYPE timestamp with time zone;

ALTER TABLE "Tracks" ALTER COLUMN "IsPublished" TYPE boolean;

ALTER TABLE "Tracks" ALTER COLUMN "Genre" TYPE text;

ALTER TABLE "Tracks" ALTER COLUMN "Duration" TYPE text;

ALTER TABLE "Tracks" ALTER COLUMN "CoverImageUrl" TYPE text;

ALTER TABLE "Tracks" ALTER COLUMN "AudioUrl" TYPE text;

ALTER TABLE "Tracks" ALTER COLUMN "Artist" TYPE text;

ALTER TABLE "Tracks" ALTER COLUMN "AlbumTitle" TYPE text;

ALTER TABLE "Tracks" ALTER COLUMN "Id" TYPE integer;
ALTER TABLE "Tracks" ALTER COLUMN "Id" DROP DEFAULT;
ALTER TABLE "Tracks" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "TeamMembers" ALTER COLUMN "Role" TYPE text;

ALTER TABLE "TeamMembers" ALTER COLUMN "Phone" TYPE text;

ALTER TABLE "TeamMembers" ALTER COLUMN "LinkedIn" TYPE text;

ALTER TABLE "TeamMembers" ALTER COLUMN "IsActive" TYPE boolean;

ALTER TABLE "TeamMembers" ALTER COLUMN "GitHub" TYPE text;

ALTER TABLE "TeamMembers" ALTER COLUMN "FullName" TYPE text;

ALTER TABLE "TeamMembers" ALTER COLUMN "Email" TYPE text;

ALTER TABLE "TeamMembers" ALTER COLUMN "DisplayOrder" TYPE integer;

ALTER TABLE "TeamMembers" ALTER COLUMN "Bio" TYPE text;

ALTER TABLE "TeamMembers" ALTER COLUMN "AvatarUrl" TYPE text;

ALTER TABLE "TeamMembers" ALTER COLUMN "Id" TYPE integer;
ALTER TABLE "TeamMembers" ALTER COLUMN "Id" DROP DEFAULT;
ALTER TABLE "TeamMembers" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY;

ALTER TABLE "Articles" ALTER COLUMN "Title" TYPE text;

ALTER TABLE "Articles" ALTER COLUMN "Tags" TYPE text;

ALTER TABLE "Articles" ALTER COLUMN "Summary" TYPE text;

ALTER TABLE "Articles" ALTER COLUMN "Slug" TYPE text;

ALTER TABLE "Articles" ALTER COLUMN "PublishedAt" TYPE timestamp with time zone;

ALTER TABLE "Articles" ALTER COLUMN "IsPublished" TYPE boolean;

ALTER TABLE "Articles" ALTER COLUMN "CoverImageUrl" TYPE text;

ALTER TABLE "Articles" ALTER COLUMN "Content" TYPE text;

ALTER TABLE "Articles" ALTER COLUMN "AuthorName" TYPE text;

ALTER TABLE "Articles" ALTER COLUMN "Id" TYPE integer;
ALTER TABLE "Articles" ALTER COLUMN "Id" DROP DEFAULT;
ALTER TABLE "Articles" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY;

CREATE TABLE "AspNetRoles" (
    "Id" text NOT NULL,
    "Name" character varying(256),
    "NormalizedName" character varying(256),
    "ConcurrencyStamp" text,
    CONSTRAINT "PK_AspNetRoles" PRIMARY KEY ("Id")
);

CREATE TABLE "AspNetUsers" (
    "Id" text NOT NULL,
    "DisplayName" text NOT NULL,
    "Bio" text,
    "AvatarUrl" text,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UserName" character varying(256),
    "NormalizedUserName" character varying(256),
    "Email" character varying(256),
    "NormalizedEmail" character varying(256),
    "EmailConfirmed" boolean NOT NULL,
    "PasswordHash" text,
    "SecurityStamp" text,
    "ConcurrencyStamp" text,
    "PhoneNumber" text,
    "PhoneNumberConfirmed" boolean NOT NULL,
    "TwoFactorEnabled" boolean NOT NULL,
    "LockoutEnd" timestamp with time zone,
    "LockoutEnabled" boolean NOT NULL,
    "AccessFailedCount" integer NOT NULL,
    CONSTRAINT "PK_AspNetUsers" PRIMARY KEY ("Id")
);

CREATE TABLE "AspNetRoleClaims" (
    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
    "RoleId" text NOT NULL,
    "ClaimType" text,
    "ClaimValue" text,
    CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserClaims" (
    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
    "UserId" text NOT NULL,
    "ClaimType" text,
    "ClaimValue" text,
    CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserLogins" (
    "LoginProvider" text NOT NULL,
    "ProviderKey" text NOT NULL,
    "ProviderDisplayName" text,
    "UserId" text NOT NULL,
    CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
    CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserRoles" (
    "UserId" text NOT NULL,
    "RoleId" text NOT NULL,
    CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
    CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserTokens" (
    "UserId" text NOT NULL,
    "LoginProvider" text NOT NULL,
    "Name" text NOT NULL,
    "Value" text,
    CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
    CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_AspNetRoleClaims_RoleId" ON "AspNetRoleClaims" ("RoleId");

CREATE UNIQUE INDEX "RoleNameIndex" ON "AspNetRoles" ("NormalizedName");

CREATE INDEX "IX_AspNetUserClaims_UserId" ON "AspNetUserClaims" ("UserId");

CREATE INDEX "IX_AspNetUserLogins_UserId" ON "AspNetUserLogins" ("UserId");

CREATE INDEX "IX_AspNetUserRoles_RoleId" ON "AspNetUserRoles" ("RoleId");

CREATE INDEX "EmailIndex" ON "AspNetUsers" ("NormalizedEmail");

CREATE UNIQUE INDEX "UserNameIndex" ON "AspNetUsers" ("NormalizedUserName");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260608161401_AddIdentity', '10.0.0');

COMMIT;

START TRANSACTION;
DROP TABLE "Articles";

DROP TABLE "Videos";

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260609161036_RemoveArticlesAndVideos', '10.0.0');

COMMIT;

START TRANSACTION;
ALTER TABLE "Tracks" ADD "Description" text;

ALTER TABLE "Tracks" ADD "IsFeatured" boolean NOT NULL DEFAULT FALSE;

ALTER TABLE "Tracks" ADD "Mood" text;

ALTER TABLE "Tracks" ADD "PlayCount" integer NOT NULL DEFAULT 0;

ALTER TABLE "Tracks" ADD "Story" text;

CREATE TABLE "Albums" (
    "Id" integer GENERATED BY DEFAULT AS IDENTITY,
    "Title" text NOT NULL,
    "CoverImageUrl" text NOT NULL,
    "Description" text,
    "ReleasedAt" timestamp with time zone NOT NULL,
    "IsPublished" boolean NOT NULL,
    CONSTRAINT "PK_Albums" PRIMARY KEY ("Id")
);

CREATE TABLE "TrackAlbums" (
    "TrackId" integer NOT NULL,
    "AlbumId" integer NOT NULL,
    "TrackNumber" integer NOT NULL,
    CONSTRAINT "PK_TrackAlbums" PRIMARY KEY ("TrackId", "AlbumId"),
    CONSTRAINT "FK_TrackAlbums_Albums_AlbumId" FOREIGN KEY ("AlbumId") REFERENCES "Albums" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TrackAlbums_Tracks_TrackId" FOREIGN KEY ("TrackId") REFERENCES "Tracks" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_TrackAlbums_AlbumId" ON "TrackAlbums" ("AlbumId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260609165115_AddAlbumsAndTrackMetadata', '10.0.0');

COMMIT;

