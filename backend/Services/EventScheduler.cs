using Backend.Data;
using Backend.Hubs;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class EventScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<EventHub> _hub;

    public EventScheduler(IServiceScopeFactory scopeFactory, IHubContext<EventHub> hub)
    {
        _scopeFactory = scopeFactory;
        _hub = hub;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Tick();
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    private static int ParseDurationToSeconds(string duration)
    {
        var parts = duration.Split(':');
        if (parts.Length == 2 && int.TryParse(parts[0], out var m) && int.TryParse(parts[1], out var s))
            return m * 60 + s;
        return 0;
    }

    private async Task Tick()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        // Start upcoming events
        var toStart = await db.Events
            .Where(e => e.Status == "Upcoming" && e.ScheduledAt <= now)
            .ToListAsync();
        foreach (var ev in toStart)
        {
            ev.Status = "Live";
            ev.CurrentTrackStartedAt = now;
        }

        // Advance live events
        var live = await db.Events
            .Include(e => e.EventTracks).ThenInclude(et => et.Track)
            .Where(e => e.Status == "Live")
            .ToListAsync();

        foreach (var ev in live)
        {
            var tracks = ev.EventTracks.Where(t => t.Status == "Approved").OrderBy(t => t.Order).ToList();
            if (tracks.Count == 0) continue;

            if (ev.CurrentTrackIndex >= tracks.Count)
            {
                ev.Status = "Ended";
                await _hub.Clients.Group($"event-{ev.Id}").SendAsync("EventEnded");
                await ProcessUploadToProfile(db, ev.Id);
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
                if (countdownElapsed >= 60)
                {
                    ev.CurrentTrackIndex++;
                    ev.CurrentTrackStartedAt = now;
                    ev.CountdownStartedAt = null;

                    if (ev.CurrentTrackIndex >= tracks.Count)
                    {
                        ev.Status = "Ended";
                        await _hub.Clients.Group($"event-{ev.Id}").SendAsync("EventEnded");
                        await ProcessUploadToProfile(db, ev.Id);
                    }
                    else
                    {
                        var next = tracks[ev.CurrentTrackIndex];
                        await _hub.Clients.Group($"event-{ev.Id}").SendAsync("TrackChanged",
                            ev.CurrentTrackIndex, new { next.TrackId, next.Track.Title, next.Track.Artist, next.Track.CoverImageUrl }, now);
                    }
                }
            }
            else if (elapsed >= durationSeconds && durationSeconds > 0)
            {
                // Track finished, start countdown
                ev.CountdownStartedAt = now;
                var nextIndex = ev.CurrentTrackIndex + 1;
                if (nextIndex < tracks.Count)
                {
                    await _hub.Clients.Group($"event-{ev.Id}").SendAsync("CountdownStarted", 60);
                }
            }
        }

        await db.SaveChangesAsync();
    }

    private async Task ProcessUploadToProfile(AppDbContext db, int eventId)
    {
        var toUpload = await db.EventTracks
            .Include(t => t.Track)
            .Where(t => t.EventId == eventId && t.UploadToProfile && t.Status == "Approved")
            .ToListAsync();
        foreach (var et in toUpload)
            et.Track.IsPublished = true;
        await db.SaveChangesAsync();
    }
}
