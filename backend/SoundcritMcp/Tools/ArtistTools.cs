using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol.Server;
using Npgsql;

namespace SoundcritMcp.Tools;

[McpServerToolType]
public static class ArtistTools
{
    [McpServerTool, Description("Gets a personalized AI recap of audience comments on an artist's tracks across their recent Soundcrit sessions. Pass the artist's user ID (UUID string). Returns a combined summary paragraph and a per-session breakdown.")]
    public static async Task<string> GetArtistRecap(string userId)
    {
        var cs = Environment.GetEnvironmentVariable("SOUNDCRIT_DB");
        if (string.IsNullOrEmpty(cs))
            return "Error: SOUNDCRIT_DB environment variable not set.";

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync();

        // Find recent ended sessions where this artist had approved tracks
        await using var sessionsCmd = new NpgsqlCommand(
            """
            SELECT DISTINCT e."Id", e."Title", e."ScheduledAt"
            FROM "Events" e
            JOIN "EventTracks" et ON et."EventId" = e."Id"
            WHERE e."Status" = 'Ended'
              AND et."UserId" = @userId
              AND et."Status" = 'Approved'
            ORDER BY e."ScheduledAt" DESC
            LIMIT 5
            """, conn);
        sessionsCmd.Parameters.AddWithValue("userId", userId);

        await using var sessionsReader = await sessionsCmd.ExecuteReaderAsync();
        var sessions = new List<(int Id, string Title, DateTime Date)>();
        while (await sessionsReader.ReadAsync())
            sessions.Add((sessionsReader.GetInt32(0), sessionsReader.GetString(1), sessionsReader.GetDateTime(2)));
        await sessionsReader.CloseAsync();

        if (sessions.Count == 0)
            return "No ended sessions found for this artist.";

        var sessionData = new List<object>();

        foreach (var (eventId, title, date) in sessions)
        {
            // Get this artist's approved tracks in this session
            await using var tracksCmd = new NpgsqlCommand(
                """
                SELECT et."Id", t."Title"
                FROM "EventTracks" et
                JOIN "Tracks" t ON t."Id" = et."TrackId"
                WHERE et."EventId" = @eventId
                  AND et."UserId" = @userId
                  AND et."Status" = 'Approved'
                ORDER BY et."Order"
                """, conn);
            tracksCmd.Parameters.AddWithValue("eventId", eventId);
            tracksCmd.Parameters.AddWithValue("userId", userId);

            await using var tracksReader = await tracksCmd.ExecuteReaderAsync();
            var tracks = new List<(int EventTrackId, string TrackTitle)>();
            while (await tracksReader.ReadAsync())
                tracks.Add((tracksReader.GetInt32(0), tracksReader.GetString(1)));
            await tracksReader.CloseAsync();

            if (tracks.Count == 0) continue;

            var eventTrackIds = tracks.Select(t => t.EventTrackId).ToArray();
            var trackComments = new Dictionary<string, List<string>>();

            foreach (var (etId, trackTitle) in tracks)
            {
                await using var commentsCmd = new NpgsqlCommand(
                    """
                    SELECT c."Content", c."DisplayName", c."IsAnonymous"
                    FROM "EventComments" c
                    WHERE c."EventTrackId" = @etId
                    ORDER BY c."CreatedAt"
                    """, conn);
                commentsCmd.Parameters.AddWithValue("etId", etId);

                await using var commentsReader = await commentsCmd.ExecuteReaderAsync();
                var commentList = new List<string>();
                while (await commentsReader.ReadAsync())
                {
                    var author = commentsReader.GetBoolean(2) ? "Anonymous" : commentsReader.GetString(1);
                    commentList.Add($"{author}: {commentsReader.GetString(0)}");
                }
                await commentsReader.CloseAsync();

                if (commentList.Count > 0)
                    trackComments[trackTitle] = commentList;
            }

            if (trackComments.Count > 0)
                sessionData.Add(new { eventId, title, date = date.ToString("yyyy-MM-dd"), trackComments });
        }

        if (sessionData.Count == 0)
            return "No comments found on this artist's tracks in recent sessions.";

        return JsonSerializer.Serialize(sessionData);
    }
}
