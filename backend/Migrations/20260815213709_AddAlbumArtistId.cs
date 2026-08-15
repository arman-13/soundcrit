using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAlbumArtistId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ArtistId",
                table: "Albums",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Albums_ArtistId",
                table: "Albums",
                column: "ArtistId");

            // Backfill ownership for albums that existed before this column. There
            // was no owner field, so the only evidence of who owns an album is the
            // artist behind its tracks: take the artist of the lowest-numbered
            // track. Albums whose tracks span multiple artists resolve to the first
            // track's artist; albums with no tracks stay NULL and are treated as
            // unowned (nobody can edit them) until an owner is set explicitly.
            migrationBuilder.Sql("""
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
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Albums_ArtistId",
                table: "Albums");

            migrationBuilder.DropColumn(
                name: "ArtistId",
                table: "Albums");
        }
    }
}
