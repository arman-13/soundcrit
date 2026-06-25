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
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
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
            .Include(e => e.EventTracks).ThenInclude(et => et.Track)
            .Where(e => e.Status == "Upcoming" && e.ScheduledAt <= now)
            .ToListAsync();
        var startedEventIds = new List<int>();
        foreach (var ev in toStart)
        {
            var hasApprovedTracks = ev.EventTracks.Any(t => t.Status == "Approved");
            if (!hasApprovedTracks)
            {
                ev.Status = "Ended";
                startedEventIds.Add(ev.Id);
                continue;
            }
            ev.Status = "Live";
            ev.CurrentTrackIndex = 0;
            ev.CurrentTrackStartedAt = now;
            ev.CountdownStartedAt = null;
            startedEventIds.Add(ev.Id);
        }
        // Save BEFORE sending signals so router.refresh() sees the updated status
        if (startedEventIds.Count > 0)
        {
            await db.SaveChangesAsync();
            foreach (var ev in toStart)
                await _hub.Clients.Group($"event-{ev.Id}").SendAsync("EventStarted");
        }

        // Advance live events
        var live = await db.Events
            .Include(e => e.EventTracks).ThenInclude(et => et.Track)
            .Where(e => e.Status == "Live")
            .ToListAsync();

        foreach (var ev in live)
        {
            // Skip events that just started this tick — they'll be processed next tick
            if (startedEventIds.Contains(ev.Id)) continue;

            var tracks = ev.EventTracks.Where(t => t.Status == "Approved").OrderBy(t => t.Order).ToList();
            if (tracks.Count == 0)
            {
                ev.Status = "Ended";
                await _hub.Clients.Group($"event-{ev.Id}").SendAsync("EventEnded");
                await ProcessUploadToProfile(db, ev.Id);
                continue;
            }

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
                if (countdownElapsed >= 40)
                {
                    var trackStartedAt = DateTime.UtcNow;
                    ev.CurrentTrackIndex++;
                    ev.CurrentTrackStartedAt = trackStartedAt;
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
                        var dto = new HubTrackDto(ev.CurrentTrackIndex, next.Id, next.Track.Id,
                            next.Track.Title, next.Track.Artist, next.Track.AudioUrl ?? "",
                            next.Track.CoverImageUrl, next.Track.Duration, next.Track.Genre,
                            ev.CurrentTrackStartedAt!.Value);
                        await _hub.Clients.Group($"event-{ev.Id}").SendAsync("TrackChanged", dto);
                    }
                }
            }
            else if (elapsed >= durationSeconds && durationSeconds > 0)
            {
                var nextIndex = ev.CurrentTrackIndex + 1;
                if (nextIndex < tracks.Count)
                {
                    // More tracks — start countdown
                    ev.CountdownStartedAt = now;
                    await _hub.Clients.Group($"event-{ev.Id}").SendAsync("CountdownStarted", 40);
                }
                else
                {
                    // Last track finished — end immediately
                    ev.Status = "Ended";
                    await _hub.Clients.Group($"event-{ev.Id}").SendAsync("EventEnded");
                    await ProcessUploadToProfile(db, ev.Id);
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
