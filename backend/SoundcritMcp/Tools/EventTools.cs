using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol.Server;
using Npgsql;

namespace SoundcritMcp.Tools;

[McpServerToolType]
public static class EventTools
{
    [McpServerTool, Description("Gets the details of a Soundcrit session/event by its ID. Returns the title, description, scheduled date, status, and the ordered list of tracks that were played.")]
    public static async Task<string> GetEvent(int eventId)
    {
        var cs = Environment.GetEnvironmentVariable("SOUNDCRIT_DB");
        if (string.IsNullOrEmpty(cs))
            return "Error: SOUNDCRIT_DB environment variable not set.";

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync();

        // Get event metadata
        await using var eventCmd = new NpgsqlCommand(
            """
            SELECT "Title", "Description", "ScheduledAt", "Status"
            FROM "Events"
            WHERE "Id" = @eventId
            """, conn);
        eventCmd.Parameters.AddWithValue("eventId", eventId);

        await using var eventReader = await eventCmd.ExecuteReaderAsync();
        if (!await eventReader.ReadAsync())
            return $"No event found with ID {eventId}.";

        var ev = new
        {
            title       = eventReader.GetString(0),
            description = eventReader.IsDBNull(1) ? null : eventReader.GetString(1),
            date        = eventReader.GetDateTime(2).ToString("yyyy-MM-dd"),
            status      = eventReader.GetString(3),
        };
        await eventReader.CloseAsync();

        // Get tracks played in order
        await using var tracksCmd = new NpgsqlCommand(
            """
            SELECT t."Title", t."Artist", t."Genre", t."Duration", et."Order"
            FROM "EventTracks" et
            JOIN "Tracks" t ON t."Id" = et."TrackId"
            WHERE et."EventId" = @eventId AND et."Status" = 'Approved'
            ORDER BY et."Order"
            """, conn);
        tracksCmd.Parameters.AddWithValue("eventId", eventId);

        await using var tracksReader = await tracksCmd.ExecuteReaderAsync();
        var tracks = new List<object>();
        while (await tracksReader.ReadAsync())
        {
            tracks.Add(new
            {
                title    = tracksReader.GetString(0),
                artist   = tracksReader.GetString(1),
                genre    = tracksReader.IsDBNull(2) ? null : tracksReader.GetString(2),
                duration = tracksReader.IsDBNull(3) ? null : tracksReader.GetString(3),
                order    = tracksReader.GetInt32(4),
            });
        }

        return JsonSerializer.Serialize(new { @event = ev, tracks });
    }

    [McpServerTool, Description("Gets all audience comments for a specific Soundcrit session/event, grouped by track. Use this together with get_event to write a narrative summary of how the audience reacted to each track during the session.")]
    public static async Task<string> GetEventComments(int eventId)
    {
        var cs = Environment.GetEnvironmentVariable("SOUNDCRIT_DB");
        if (string.IsNullOrEmpty(cs))
            return "Error: SOUNDCRIT_DB environment variable not set.";

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            """
            SELECT t."Title", c."Content", c."DisplayName", c."IsAnonymous", c."CreatedAt"
            FROM "EventComments" c
            JOIN "EventTracks" et ON et."Id" = c."EventTrackId"
            JOIN "Tracks" t ON t."Id" = et."TrackId"
            WHERE c."EventId" = @eventId
            ORDER BY et."Order", c."CreatedAt"
            """, conn);
        cmd.Parameters.AddWithValue("eventId", eventId);

        await using var reader = await cmd.ExecuteReaderAsync();

        // Group comments by track title
        var byTrack = new Dictionary<string, List<object>>();
        while (await reader.ReadAsync())
        {
            var trackTitle  = reader.GetString(0);
            var content     = reader.GetString(1);
            var displayName = reader.GetBoolean(3) ? "Anonymous" : reader.GetString(2);

            if (!byTrack.ContainsKey(trackTitle))
                byTrack[trackTitle] = [];

            byTrack[trackTitle].Add(new { author = displayName, comment = content });
        }

        if (byTrack.Count == 0)
            return "No comments found for this event.";

        return JsonSerializer.Serialize(byTrack);
    }
}
