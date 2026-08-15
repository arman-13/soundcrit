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
        // Projected to just the playback fields. This endpoint is polled every few
        // seconds by every listener in every live session; the old version eagerly
        // loaded the whole track lineup on each call and used none of it.
        var ev = await _db.Events
            .Where(e => e.Id == id)
            .Select(e => new
            {
                e.Status,
                e.CurrentTrackIndex,
                e.CurrentTrackStartedAt,
                e.CountdownStartedAt,
            })
            .FirstOrDefaultAsync();
        if (ev is null) return NotFound();

        var now = DateTime.UtcNow;
        double elapsed = 0;
        double countdown = 0;

        if (ev.Status == "Live" && ev.CurrentTrackStartedAt.HasValue)
            elapsed = (now - ev.CurrentTrackStartedAt.Value).TotalSeconds;

        if (ev.CountdownStartedAt.HasValue)
            countdown = Math.Max(0, 40 - (now - ev.CountdownStartedAt.Value).TotalSeconds);

        return Ok(new EventSyncDto(ev.Status, ev.CurrentTrackIndex, elapsed, countdown, now));
    }
}
