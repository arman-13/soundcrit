using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/events/{eventId}/tracks")]
public class EventTracksController : ControllerBase
{
    private readonly AppDbContext _db;

    public EventTracksController(AppDbContext db) => _db = db;

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Submit(int eventId, SubmitEventTrackBody body)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var isApproved = await _db.EventRequests.AnyAsync(r =>
            r.EventId == eventId && r.UserId == userId && r.Status == "Approved");
        var ev = await _db.Events.FindAsync(eventId);
        var isHost = ev?.HostId == userId;
        if (!isApproved && !isHost) return Forbid();

        var exists = await _db.EventTracks.AnyAsync(t => t.EventId == eventId && t.TrackId == body.TrackId);
        if (exists) return BadRequest("Track already submitted.");

        var maxOrder = await _db.EventTracks.Where(t => t.EventId == eventId).MaxAsync(t => (int?)t.Order) ?? 0;

        _db.EventTracks.Add(new EventTrack
        {
            EventId = eventId, TrackId = body.TrackId, UserId = userId,
            UploadToProfile = body.UploadToProfile, Order = maxOrder + 1,
            SubmittedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EventTrackDto>>> GetAll(int eventId)
    {
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var isHost = ev.HostId == userId;

        var query = _db.EventTracks.Include(t => t.Track).Where(t => t.EventId == eventId);
        if (!isHost) query = query.Where(t => t.UserId == userId);

        var tracks = await query.OrderBy(t => t.Order)
            .Select(t => new EventTrackDto(t.Id, t.TrackId, t.Track.Title, t.Track.Artist,
                t.Track.Duration, t.Track.AudioUrl ?? "", t.Track.CoverImageUrl, t.Track.Genre, t.Track.Mood,
                t.Order, t.Status, t.UserId, t.UploadToProfile))
            .ToListAsync();
        return Ok(tracks);
    }

    [Authorize]
    [HttpPut("{trackId}")]
    public async Task<IActionResult> UpdateStatus(int eventId, int trackId, UpdateEventTrackBody body)
    {
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (ev.HostId != userId) return Forbid();

        var et = await _db.EventTracks.FindAsync(trackId);
        if (et is null) return NotFound();
        et.Status = body.Status;
        et.Order = body.Order;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{trackId}")]
    public async Task<IActionResult> Delete(int eventId, int trackId)
    {
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (ev.HostId != userId) return Forbid();

        var et = await _db.EventTracks.FindAsync(trackId);
        if (et is null) return NotFound();
        _db.EventTracks.Remove(et);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
