using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.Ollama;
using Backend.Data;

namespace Backend.Services;

public class ArtistRecapService
{
    private readonly AppDbContext _db;
    private readonly Kernel _kernel;

    public ArtistRecapService(AppDbContext db, IConfiguration config)
    {
        _db = db;

#pragma warning disable SKEXP0070
        _kernel = Kernel.CreateBuilder()
            .AddOllamaChatCompletion("llama3.1", new Uri("http://localhost:11434"))
            .Build();
#pragma warning restore SKEXP0070
    }

    public record SessionRecap(int EventId, string Title, string? TrackRecap);
    public record ArtistRecapResult(string Combined, List<SessionRecap> Sessions);

    public async Task<ArtistRecapResult> GenerateRecapAsync(string userId)
    {
        // Find ended sessions where this user submitted a track
        var sessions = await _db.Events
            .Where(e => e.Status == "Ended"
                && _db.EventTracks.Any(et => et.EventId == e.Id && et.UserId == userId && et.Status == "Approved"))
            .OrderByDescending(e => e.ScheduledAt)
            .Take(5)
            .ToListAsync();

        if (sessions.Count == 0)
            return new ArtistRecapResult("No recent sessions found with your tracks.", []);

        var sessionRecaps = new List<SessionRecap>();
        var allCommentBlocks = new List<string>();

        foreach (var session in sessions)
        {
            // Get this user's tracks in this session
            var userTracks = await _db.EventTracks
                .Where(et => et.EventId == session.Id && et.UserId == userId && et.Status == "Approved")
                .Include(et => et.Track)
                .ToListAsync();

            if (userTracks.Count == 0) continue;

            var trackIds = userTracks.Select(et => et.Id).ToList();

            // Get comments only on this user's tracks
            var comments = await _db.EventComments
                .Where(c => c.EventId == session.Id && trackIds.Contains(c.EventTrackId))
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();

            if (comments.Count == 0) continue;

            var commentLines = new List<string>();
            foreach (var et in userTracks)
            {
                var trackComments = comments.Where(c => c.EventTrackId == et.Id).ToList();
                if (trackComments.Count == 0) continue;
                commentLines.Add($"Track: \"{et.Track.Title}\"");
                foreach (var c in trackComments)
                    commentLines.Add($"  - {(c.IsAnonymous ? "Anonymous" : c.DisplayName)}: {c.Content}");
            }

            if (commentLines.Count == 0) continue;

            var block = $"Session: {session.Title} ({session.ScheduledAt:yyyy-MM-dd})\n{string.Join("\n", commentLines)}";
            allCommentBlocks.Add(block);
            sessionRecaps.Add(new SessionRecap(session.Id, session.Title, block));
        }

        if (allCommentBlocks.Count == 0)
            return new ArtistRecapResult("Your tracks haven't received any comments yet.", []);

        var allComments = string.Join("\n\n", allCommentBlocks);

        var prompt = $"""
            Below are comments left on an artist's tracks across their recent Soundcrit sessions.
            Write a recap of how their music landed. Use markdown formatting:
            - Use **track name** (bold) each time you mention a track
            - Write one short paragraph per track or theme, separated by a blank line
            - Start directly with an observation — no preamble, no intro sentence
            - Speak directly to the artist ("your", "listeners", "the room")
            - Tone: honest, sharp, like a trusted colleague who actually listened
            - Do not invent anything not in the comments

            Comments:
            {allComments}
            """;

#pragma warning disable SKEXP0001
        var settings = new OllamaPromptExecutionSettings { FunctionChoiceBehavior = FunctionChoiceBehavior.Auto() };
#pragma warning restore SKEXP0001

        var result = await _kernel.InvokePromptAsync(prompt, new KernelArguments(settings));
        var combined = result.ToString();

        return new ArtistRecapResult(combined, sessionRecaps);
    }
}
