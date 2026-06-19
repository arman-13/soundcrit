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
            .Include(e => e.EventTracks).ThenInclude(et => et.Track)
            .OrderByDescending(e => e.ScheduledAt)
            .ToListAsync();

        var ordered = events
            .OrderBy(e => e.Status == "Live" ? 0 : e.Status == "Upcoming" ? 1 : 2)
            .ThenByDescending(e => e.ScheduledAt)
            .Select(e =>
            {
                var approved = e.EventTracks.Where(t => t.Status == "Approved").ToList();
                var genres = approved.Select(t => t.Track.Genre).Where(g => !string.IsNullOrEmpty(g)).Distinct().ToList();
                return new EventSummaryDto(e.Id, e.Title, e.Description, e.CoverImageUrl,
                    e.ScheduledAt, e.Status, e.HostId, approved.Count, genres!);
            });

        return Ok(ordered);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EventDetailDto>> GetById(int id)
    {
        var ev = await _db.Events
            .Include(e => e.EventTracks).ThenInclude(et => et.Track)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (ev is null) return NotFound();

        var host = await _userManager.FindByIdAsync(ev.HostId);
        var tracks = ev.EventTracks
            .Where(t => t.Status == "Approved")
            .OrderBy(t => t.Order)
            .Select(t => new EventTrackDto(t.Id, t.TrackId, t.Track.Title, t.Track.Artist,
                t.Track.Duration, t.Track.CoverImageUrl, t.Track.Genre, t.Track.Mood,
                t.Order, t.Status, t.UserId, t.UploadToProfile))
            .ToList();

        var playback = new PlaybackStateDto(ev.Status, ev.CurrentTrackIndex,
            ev.CurrentTrackStartedAt, ev.CountdownStartedAt, DateTime.UtcNow);

        var genres = tracks.Select(t => t.Genre).Where(g => !string.IsNullOrEmpty(g)).Distinct().ToList();

        return Ok(new EventDetailDto(ev.Id, ev.Title, ev.Description, ev.CoverImageUrl,
            ev.ScheduledAt, ev.Status, ev.HostId,
            host?.DisplayName ?? host?.UserName ?? "Unknown", host?.AvatarUrl,
            tracks.Count, genres!, tracks, playback));
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult> Create(CreateEventRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await _userManager.FindByIdAsync(userId);
        var isAdmin = await _userManager.IsInRoleAsync(user!, "Admin");
        if (!isAdmin) return Forbid();

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
