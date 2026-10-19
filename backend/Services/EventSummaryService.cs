using System.ComponentModel;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.Ollama;
using Npgsql;

namespace Backend.Services;

public class EventSummaryService
{
    private readonly string _connectionString;
    private readonly Kernel _kernel;

    public EventSummaryService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not configured.");

#pragma warning disable SKEXP0070
        _kernel = Kernel.CreateBuilder()
            .AddOllamaChatCompletion("llama3.1", new Uri("http://localhost:11434"))
            .Build();
#pragma warning restore SKEXP0070

        _kernel.Plugins.AddFromObject(new EventPlugin(_connectionString));
    }

    public async Task<string> SummarizeEventAsync(int eventId)
    {
#pragma warning disable SKEXP0001
        var settings = new OllamaPromptExecutionSettings { FunctionChoiceBehavior = FunctionChoiceBehavior.Auto() };
#pragma warning restore SKEXP0001

        var result = await _kernel.InvokePromptAsync(
            $"""
            You are a music journalist writing for an online magazine.
            Write an engaging, magazine-style summary of Soundcrit session with ID {eventId}.
            First call get_event to get the session details and tracklist.
            Then call get_event_comments to get the audience reactions.
            Write the summary in this structure:
            1. A short punchy opening paragraph setting the scene
            2. A paragraph for each track covering what was played and how the audience reacted
            3. A closing sentence capturing the overall mood of the session
            Keep it concise, vivid, and interesting to read.
            If the event or comments are not found, say so honestly — do not invent details.
            """,
            new KernelArguments(settings)
        );

        var summary = result.ToString();

        // Save to database
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            """
            UPDATE "Events"
            SET "AiSummary" = @summary, "AiSummaryGeneratedAt" = @now
            WHERE "Id" = @id
            """, conn);
        cmd.Parameters.AddWithValue("summary", summary);
        cmd.Parameters.AddWithValue("now", DateTime.UtcNow);
        cmd.Parameters.AddWithValue("id", eventId);
        await cmd.ExecuteNonQueryAsync();

        return summary;
    }
}

// ── Plugin — tools the agent can call ────────────────────────────────────────
public class EventPlugin
{
    private readonly string _cs;

    public EventPlugin(string connectionString) => _cs = connectionString;

    [KernelFunction, Description("Gets the details of a Soundcrit session by its ID. Returns title, date, status, and the ordered list of tracks played.")]
    public async Task<string> GetEvent(int eventId)
    {
        await using var conn = new NpgsqlConnection(_cs);
        await conn.OpenAsync();

        await using var eventCmd = new NpgsqlCommand(
            """
            SELECT "Title", "Description", "ScheduledAt", "Status"
            FROM "Events" WHERE "Id" = @id
            """, conn);
        eventCmd.Parameters.AddWithValue("id", eventId);

        await using var er = await eventCmd.ExecuteReaderAsync();
        if (!await er.ReadAsync()) return $"No event found with ID {eventId}.";

        var title       = er.GetString(0);
        var description = er.IsDBNull(1) ? "" : er.GetString(1);
        var date        = er.GetDateTime(2).ToString("yyyy-MM-dd");
        var status      = er.GetString(3);
        await er.CloseAsync();

        await using var tracksCmd = new NpgsqlCommand(
            """
            SELECT t."Title", t."Artist", t."Genre", t."Duration", et."Order"
            FROM "EventTracks" et
            JOIN "Tracks" t ON t."Id" = et."TrackId"
            WHERE et."EventId" = @id AND et."Status" = 'Approved'
            ORDER BY et."Order"
            """, conn);
        tracksCmd.Parameters.AddWithValue("id", eventId);

        await using var tr = await tracksCmd.ExecuteReaderAsync();
        var tracks = new List<string>();
        while (await tr.ReadAsync())
            tracks.Add($"{tr.GetInt32(4)}. \"{tr.GetString(0)}\" by {tr.GetString(1)} ({(tr.IsDBNull(3) ? "?" : tr.GetString(3))})");

        return $"Event: {title}\nDate: {date}\nStatus: {status}\nDescription: {description}\nTracklist:\n{string.Join("\n", tracks)}";
    }

    [KernelFunction, Description("Gets all audience comments for a Soundcrit session, grouped by track. Use this to understand how listeners reacted to each track during the session.")]
    public async Task<string> GetEventComments(int eventId)
    {
        await using var conn = new NpgsqlConnection(_cs);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            """
            SELECT t."Title", c."Content", c."IsAnonymous", c."DisplayName"
            FROM "EventComments" c
            JOIN "EventTracks" et ON et."Id" = c."EventTrackId"
            JOIN "Tracks" t ON t."Id" = et."TrackId"
            WHERE c."EventId" = @id
            ORDER BY et."Order", c."CreatedAt"
            """, conn);
        cmd.Parameters.AddWithValue("id", eventId);

        await using var reader = await cmd.ExecuteReaderAsync();
        var byTrack = new Dictionary<string, List<string>>();
        while (await reader.ReadAsync())
        {
            var track   = reader.GetString(0);
            var content = reader.GetString(1);
            var author  = reader.GetBoolean(2) ? "Anonymous" : reader.GetString(3);
            if (!byTrack.ContainsKey(track)) byTrack[track] = [];
            byTrack[track].Add($"{author}: {content}");
        }

        if (byTrack.Count == 0) return "No comments found for this event.";

        var lines = byTrack.SelectMany(kv =>
            new[] { $"\n[{kv.Key}]" }.Concat(kv.Value));
        return string.Join("\n", lines);
    }
}
