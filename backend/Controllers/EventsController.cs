using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public EventsController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EventSummaryDto>>> GetAll()
    {
        var events = await _db.Events
            .OrderBy(e => e.Status == "Live" ? 0 : e.Status == "Upcoming" ? 1 : 2)
            .ThenByDescending(e => e.ScheduledAt)
            .Select(e => new EventSummaryDto(
                e.Id, e.Title, e.Description, e.CoverImageUrl, e.ScheduledAt, e.Status, e.HostId,
                e.EventTracks.Count(t => t.Status == "Approved"),
                e.EventTracks
                    .Where(t => t.Status == "Approved" && t.Track.Genre != null && t.Track.Genre != "")
                    .Select(t => t.Track.Genre!)
                    .Distinct()
                    .ToList()
            ))
            .ToListAsync();

        return Ok(events);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EventDetailDto>> GetById(int id)
    {
        var result = await _db.Events
            .Where(e => e.Id == id)
            .Select(e => new
            {
                Event = e,
                Host = _db.Users.Where(u => u.Id == e.HostId)
                    .Select(u => new { u.DisplayName, u.UserName, u.AvatarUrl })
                    .FirstOrDefault(),
                Tracks = e.EventTracks
                    .OrderBy(t => t.Order)
                    .Select(t => new EventTrackDto(
                        t.Id, t.TrackId, t.Track.Title, t.Track.Artist,
                        t.Track.Duration, t.Track.AudioUrl ?? "", t.Track.CoverImageUrl,
                        t.Track.Genre, t.Track.Mood, t.Order, t.Status, t.UserId, t.UploadToProfile,
                        t.Track.Description))
                    .ToList(),
            })
            .FirstOrDefaultAsync();

        if (result is null) return NotFound();

        var approvedTracks = result.Tracks.Where(t => t.Status == "Approved").ToList();
        var genres = approvedTracks.Select(t => t.Genre).Where(g => !string.IsNullOrEmpty(g)).Distinct().ToList();
        var ev = result.Event;
        var playback = new PlaybackStateDto(ev.Status, ev.CurrentTrackIndex,
            ev.CurrentTrackStartedAt, ev.CountdownStartedAt, DateTime.UtcNow);

        return Ok(new EventDetailDto(ev.Id, ev.Title, ev.Description, ev.CoverImageUrl,
            ev.ScheduledAt, ev.Status, ev.HostId,
            result.Host?.DisplayName ?? result.Host?.UserName ?? "Unknown", result.Host?.AvatarUrl,
            approvedTracks.Count, genres!, result.Tracks, playback));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult> Create(CreateEventRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var ev = new Event
        {
            Title = req.Title, Description = req.Description,
            CoverImageUrl = req.CoverImageUrl,
            ScheduledAt = DateTime.SpecifyKind(req.ScheduledAt, DateTimeKind.Utc),
            HostId = userId, CreatedAt = DateTime.UtcNow
        };
        _db.Events.Add(ev);
        await _db.SaveChangesAsync();
        return Ok(new { ev.Id });
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateEventRequest req)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (ev.HostId != userId) return Forbid();

        ev.Title = req.Title;
        ev.Description = req.Description;
        ev.CoverImageUrl = req.CoverImageUrl;
        ev.ScheduledAt = DateTime.SpecifyKind(req.ScheduledAt, DateTimeKind.Utc);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (ev.HostId != userId) return Forbid();
        _db.Events.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
