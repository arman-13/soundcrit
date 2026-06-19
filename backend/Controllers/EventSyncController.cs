using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/events")]
public class EventSyncController : ControllerBase
{
    private readonly AppDbContext _db;
    public EventSyncController(AppDbContext db) => _db = db;

    [HttpGet("{id}/sync")]
    public async Task<ActionResult<EventSyncDto>> Sync(int id)
    {
        var ev = await _db.Events
            .Include(e => e.EventTracks).ThenInclude(et => et.Track)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (ev is null) return NotFound();

        var now = DateTime.UtcNow;
        double elapsed = 0;
        double countdown = 0;

        if (ev.Status == "Live" && ev.CurrentTrackStartedAt.HasValue)
            elapsed = (now - ev.CurrentTrackStartedAt.Value).TotalSeconds;

        if (ev.CountdownStartedAt.HasValue)
            countdown = Math.Max(0, 60 - (now - ev.CountdownStartedAt.Value).TotalSeconds);

        return Ok(new EventSyncDto(ev.Status, ev.CurrentTrackIndex, elapsed, countdown, now));
    }
}
