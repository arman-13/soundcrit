using Backend.Data;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class EventScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<EventHub> _hub;
    private readonly ILogger<EventScheduler> _logger;
    private readonly EventSummaryService _summary;

    public EventScheduler(IServiceScopeFactory scopeFactory, IHubContext<EventHub> hub, ILogger<EventScheduler> logger, EventSummaryService summary)
    {
        _scopeFactory = scopeFactory;
        _hub = hub;
        _logger = logger;
        _summary = summary;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Tick();
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "EventScheduler tick failed, will retry next interval");
            }
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    // A track whose duration can't be read must not be able to wedge a session:
    // the advance check below only fires when durationSeconds > 0, so returning 0
    // meant the scheduler sat on that track forever and the session never ended.
    // "h:mm:ss" is accepted too — previously any track of an hour or longer
    // parsed as 0 and stalled the event permanently.
    private const int FallbackTrackSeconds = 210;

    internal static int ParseDurationToSeconds(string? duration)
    {
        if (string.IsNullOrWhiteSpace(duration)) return FallbackTrackSeconds;

        var parts = duration.Split(':');
        var values = new int[parts.Length];
        for (var i = 0; i < parts.Length; i++)
        {
            if (!int.TryParse(parts[i].Trim(), out values[i]) || values[i] < 0)
                return FallbackTrackSeconds;
        }

        var seconds = parts.Length switch
        {
            1 => values[0],
            2 => values[0] * 60 + values[1],
            3 => values[0] * 3600 + values[1] * 60 + values[2],
            _ => 0,
        };

        return seconds > 0 ? seconds : FallbackTrackSeconds;
    }

    // Identifies this scheduler's advisory lock. Any bigint works as long as
    // nothing else in the database picks the same number.
    private const long SchedulerLockKey = 771_034_920_115;

    private async Task Tick()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        // The scheduler is registered in every process, so scaling the API to more
        // than one replica used to mean several schedulers advancing the same
        // events every 5 seconds — double-skipping tracks and racing each other's
        // writes to CurrentTrackIndex, with nothing in the logs to show for it.
        //
        // A transaction-scoped advisory lock makes exactly one instance the ticker
        // at a time. pg_try_advisory_xact_lock returns immediately rather than
        // queueing, so the losing instances simply skip this tick instead of
        // piling up, and the lock is released by the commit or rollback below —
        // including if the process dies mid-tick.
        await using var tx = await db.Database.BeginTransactionAsync();

        var isTicker = await db.Database
            .SqlQuery<bool>($"SELECT pg_try_advisory_xact_lock({SchedulerLockKey}) AS \"Value\"")
            .SingleAsync();

        if (!isTicker) return;

        // Signals are queued and only flushed once the transaction has committed,
        // so a client reacting to a push can never read pre-commit state back from
        // GET /events/{id}/sync.
        //
        // Note for multi-instance deployments: the lock above makes advancing
        // correct, but SignalR groups are per-process without a backplane, so
        // these pushes only reach listeners connected to whichever instance won
        // the tick. Everyone else falls back to polling /sync, which both clients
        // already do every 5s — degraded latency rather than breakage. Running
        // more than one replica should come with a Redis backplane.
        var pending = new List<(int EventId, string Signal, object? Payload)>();
        var uploadToProfileEventIds = new List<int>();

        // Start upcoming events — don't load Track data, only need EventTracks.Status
        var toStart = await db.Events
            .Include(e => e.EventTracks)
            .Where(e => e.Status == "Upcoming" && e.ScheduledAt <= now)
            .ToListAsync();
        var startedEventIds = new List<int>();
        foreach (var ev in toStart)
        {
            var hasApprovedTracks = ev.EventTracks.Any(t => t.Status == "Approved");
            if (!hasApprovedTracks)
            {
                // Nothing approved to play, so this session is over before it
                // began. It previously still emitted "EventStarted", sending
                // listeners to a live view of an event that had just ended.
                ev.Status = "Ended";
                startedEventIds.Add(ev.Id);
                pending.Add((ev.Id, "EventEnded", null));
                continue;
            }
            ev.Status = "Live";
            ev.CurrentTrackIndex = 0;
            ev.CurrentTrackStartedAt = now;
            ev.CountdownStartedAt = null;
            startedEventIds.Add(ev.Id);
            pending.Add((ev.Id, "EventStarted", null));
        }

        // Advance live events — include tracks and their data
        var live = await db.Events
            .Where(e => e.Status == "Live")
            .Include(e => e.EventTracks).ThenInclude(et => et.Track)
            .ToListAsync();

        foreach (var ev in live)
        {
            // Skip events that just started this tick — they'll be processed next tick
            if (startedEventIds.Contains(ev.Id)) continue;

            var tracks = ev.EventTracks.Where(t => t.Status == "Approved").OrderBy(t => t.Order).ToList();
            if (tracks.Count == 0)
            {
                ev.Status = "Ended";
                pending.Add((ev.Id, "EventEnded", null));
                uploadToProfileEventIds.Add(ev.Id);
                continue;
            }

            if (ev.CurrentTrackIndex >= tracks.Count)
            {
                ev.Status = "Ended";
                pending.Add((ev.Id, "EventEnded", null));
                uploadToProfileEventIds.Add(ev.Id);
                continue;
            }

            var currentTrack = tracks[ev.CurrentTrackIndex];
            var durationSeconds = ParseDurationToSeconds(currentTrack.Track.Duration);
            var elapsed = ev.CurrentTrackStartedAt.HasValue
                ? (now - ev.CurrentTrackStartedAt.Value).TotalSeconds : 0;

            // In countdown phase
            if (ev.CountdownStartedAt.HasValue)
            {
                var countdownElapsed = (now - ev.CountdownStartedAt.Value).TotalSeconds;
                if (countdownElapsed >= 40)
                {
                    var trackStartedAt = DateTime.UtcNow;
                    ev.CurrentTrackIndex++;
                    ev.CurrentTrackStartedAt = trackStartedAt;
                    ev.CountdownStartedAt = null;

                    if (ev.CurrentTrackIndex >= tracks.Count)
                    {
                        ev.Status = "Ended";
                        pending.Add((ev.Id, "EventEnded", null));
                        uploadToProfileEventIds.Add(ev.Id);
                    }
                    else
                    {
                        var next = tracks[ev.CurrentTrackIndex];
                        var dto = new HubTrackDto(ev.CurrentTrackIndex, next.Id, next.Track.Id,
                            next.Track.Title, next.Track.Artist, next.Track.AudioUrl ?? "",
                            next.Track.CoverImageUrl, next.Track.Duration, next.Track.Genre,
                            ev.CurrentTrackStartedAt!.Value);
                        pending.Add((ev.Id, "TrackChanged", dto));
                    }
                }
            }
            else if (elapsed >= durationSeconds)
            {
                var nextIndex = ev.CurrentTrackIndex + 1;
                if (nextIndex < tracks.Count)
                {
                    // More tracks — start countdown
                    ev.CountdownStartedAt = now;
                    pending.Add((ev.Id, "CountdownStarted", 40));
                }
                else
                {
                    // Last track finished — end immediately
                    ev.Status = "Ended";
                    pending.Add((ev.Id, "EventEnded", null));
                    uploadToProfileEventIds.Add(ev.Id);
                }
            }
        }

        foreach (var eventId in uploadToProfileEventIds)
            await ProcessUploadToProfile(db, eventId);

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        // Generate AI summaries after the transaction commits — one per newly ended event.
        // Fire-and-forget: summary generation is slow (LLM call) and must not block the tick.
        foreach (var (eventId, signal, _) in pending.Where(p => p.Signal == "EventEnded"))
            _ = Task.Run(() => _summary.SummarizeEventAsync(eventId));
        // The advisory lock is released here, with the commit.

        foreach (var (eventId, signal, payload) in pending)
        {
            var client = _hub.Clients.Group($"event-{eventId}");
            if (payload is null) await client.SendAsync(signal);
            else await client.SendAsync(signal, payload);
        }
    }

    // No SaveChanges of its own: these edits are part of the caller's transaction
    // and are committed with the rest of the tick.
    private static async Task ProcessUploadToProfile(AppDbContext db, int eventId)
    {
        var toUpload = await db.EventTracks
            .Include(t => t.Track)
            .Where(t => t.EventId == eventId && t.UploadToProfile && t.Status == "Approved")
            .ToListAsync();
        foreach (var et in toUpload)
            et.Track.IsPublished = true;
    }
}
