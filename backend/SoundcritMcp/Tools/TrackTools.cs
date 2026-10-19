using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol.Server;
using Npgsql;

namespace SoundcritMcp.Tools;

[McpServerToolType]
public static class TrackTools
{
    [McpServerTool, Description("Gets a Soundcrit track by its ID. Returns the track title, artist, genre, mood, duration, and play count.")]
    public static async Task<string> GetTrack(int id)
    {
        var cs = Environment.GetEnvironmentVariable("SOUNDCRIT_DB");
        if (string.IsNullOrEmpty(cs))
            return "Error: SOUNDCRIT_DB environment variable not set.";

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            "SELECT \"Title\", \"Artist\", \"Genre\", \"Mood\", \"Duration\", \"PlayCount\" FROM \"Tracks\" WHERE \"Id\" = @id",
            conn);
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return $"No track found with ID {id}.";

        var result = new
        {
            title    = reader.GetString(0),
            artist   = reader.GetString(1),
            genre    = reader.IsDBNull(2) ? null : reader.GetString(2),
            mood     = reader.IsDBNull(3) ? null : reader.GetString(3),
            duration = reader.IsDBNull(4) ? null : reader.GetString(4),
            playCount = reader.GetInt32(5),
        };

        return JsonSerializer.Serialize(result);
    }
    [McpServerTool, Description("Search Soundcrit tracks by genre or mood. Returns a list of matching tracks with title, artist, genre, mood, and duration.")]
public static async Task<string> SearchTracks(string? genre = null, string? mood = null)
{
    var cs = Environment.GetEnvironmentVariable("SOUNDCRIT_DB");
    if (string.IsNullOrEmpty(cs))
        return "Error: SOUNDCRIT_DB environment variable not set.";

    await using var conn = new NpgsqlConnection(cs);
    await conn.OpenAsync();

    var conditions = new List<string> { "\"IsPublished\" = true" };
    if (!string.IsNullOrEmpty(genre))
        conditions.Add("LOWER(\"Genre\") = LOWER(@genre)");
    if (!string.IsNullOrEmpty(mood))
        conditions.Add("\"Mood\" ILIKE @mood");

    var sql = $"""
        SELECT "Title", "Artist", "Genre", "Mood", "Duration"
        FROM "Tracks"
        WHERE {string.Join(" AND ", conditions)}
        ORDER BY "PlayCount" DESC
        LIMIT 20
        """;

    await using var cmd = new NpgsqlCommand(sql, conn);
    if (!string.IsNullOrEmpty(genre)) cmd.Parameters.AddWithValue("genre", genre);
    if (!string.IsNullOrEmpty(mood))  cmd.Parameters.AddWithValue("mood", $"%{mood}%");

    await using var reader = await cmd.ExecuteReaderAsync();
    var tracks = new List<object>();
    while (await reader.ReadAsync())
    {
        tracks.Add(new
        {
            title    = reader.GetString(0),
            artist   = reader.GetString(1),
            genre    = reader.IsDBNull(2) ? null : reader.GetString(2),
            mood     = reader.IsDBNull(3) ? null : reader.GetString(3),
            duration = reader.IsDBNull(4) ? null : reader.GetString(4),
        });
    }

    if (tracks.Count == 0) return "No tracks found matching those filters.";
    return JsonSerializer.Serialize(tracks);
}
}