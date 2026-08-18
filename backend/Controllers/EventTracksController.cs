using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/events/{eventId}/tracks")]
public class EventTracksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<EventHub> _hub;

    public EventTracksController(AppDbContext db, IHubContext<EventHub> hub)
    {
        _db = db;
        _hub = hub;
    }

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

        // You may only submit your own track. Previously any approved participant
        // could submit an arbitrary TrackId, including another artist's
        // unpublished work, into a session lineup.
        var track = await _db.Tracks.FindAsync(body.TrackId);
        if (track is null) return NotFound("Track not found.");
        if (track.ArtistId != userId) return Forbid();

        // Guests get one slot each so no single artist can crowd out the lineup.
        // The host is curating their own session, so they may submit as many as they like.
        if (!isHost)
        {
            var alreadySubmitted = await _db.EventTracks.AnyAsync(t => t.EventId == eventId && t.UserId == userId);
            if (alreadySubmitted) return Conflict("You've already submitted a track to this session.");
        }

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

        var submitter = await _db.Users.FindAsync(userId);
        await _hub.Clients.Group($"event-{eventId}").SendAsync("TrackSubmitted", new {
            TrackTitle = track?.Title ?? "Unknown",
            SubmitterName = submitter?.DisplayName ?? submitter?.UserName ?? "Someone"
        });

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
                t.Order, t.Status, t.UserId, t.UploadToProfile, t.Track.Description))
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

        // Scoped to the event in the route: FindAsync(trackId) alone let the host
        // of one session approve, reject or reorder a submission belonging to a
        // different session entirely.
        var et = await _db.EventTracks.FirstOrDefaultAsync(t => t.Id == trackId && t.EventId == eventId);
        if (et is null) return NotFound();
        et.Status = body.Status;
        et.Order = body.Order;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder(int eventId, ReorderEventTracksBody body)
    {
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (ev.HostId != userId) return Forbid();

        var ids = body.Items.Select(i => i.Id).ToList();
        var tracks = await _db.EventTracks.Where(t => t.EventId == eventId && ids.Contains(t.Id)).ToListAsync();
        foreach (var item in body.Items)
        {
            var track = tracks.FirstOrDefault(t => t.Id == item.Id);
            if (track != null) track.Order = item.Order;
        }
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

        // Scoped to the event in the route — see UpdateStatus.
        var et = await _db.EventTracks.FirstOrDefaultAsync(t => t.Id == trackId && t.EventId == eventId);
        if (et is null) return NotFound();
        _db.EventTracks.Remove(et);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
