using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EventComments_EventId",
                table: "EventComments");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_IsPublished",
                table: "Tracks",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_IsPublished_PublishedAt",
                table: "Tracks",
                columns: new[] { "IsPublished", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EventTracks_EventId_Status",
                table: "EventTracks",
                columns: new[] { "EventId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Events_ScheduledAt",
                table: "Events",
                column: "ScheduledAt");

            migrationBuilder.CreateIndex(
                name: "IX_Events_Status",
                table: "Events",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Events_Status_ScheduledAt",
                table: "Events",
                columns: new[] { "Status", "ScheduledAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EventComments_EventId_EventTrackId",
                table: "EventComments",
                columns: new[] { "EventId", "EventTrackId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tracks_IsPublished",
                table: "Tracks");

            migrationBuilder.DropIndex(
                name: "IX_Tracks_IsPublished_PublishedAt",
                table: "Tracks");

            migrationBuilder.DropIndex(
                name: "IX_EventTracks_EventId_Status",
                table: "EventTracks");

            migrationBuilder.DropIndex(
                name: "IX_Events_ScheduledAt",
                table: "Events");

            migrationBuilder.DropIndex(
                name: "IX_Events_Status",
                table: "Events");

            migrationBuilder.DropIndex(
                name: "IX_Events_Status_ScheduledAt",
                table: "Events");

            migrationBuilder.DropIndex(
                name: "IX_EventComments_EventId_EventTrackId",
                table: "EventComments");

            migrationBuilder.CreateIndex(
                name: "IX_EventComments_EventId",
                table: "EventComments",
                column: "EventId");
        }
    }
}
