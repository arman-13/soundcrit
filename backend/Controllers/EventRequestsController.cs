using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/events/{eventId}/requests")]
public class EventRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<EventHub> _hub;

    public EventRequestsController(AppDbContext db, IHubContext<EventHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult> GetMine(int eventId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var req = await _db.EventRequests.FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId);
        if (req is null) return Ok(new { status = (string?)null });
        return Ok(new { status = req.Status });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Submit(int eventId, SubmitJoinRequestBody body)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var exists = await _db.EventRequests.AnyAsync(r => r.EventId == eventId && r.UserId == userId);
        if (exists) return BadRequest("Already requested.");

        _db.EventRequests.Add(new EventRequest
        {
            EventId = eventId, UserId = userId,
            Message = body.Message, RequestedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EventRequestDto>>> GetAll(int eventId)
    {
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (ev.HostId != userId) return Forbid();

        var requests = await _db.EventRequests
            .Where(r => r.EventId == eventId)
            .OrderBy(r => r.RequestedAt)
            .Select(r => new EventRequestDto(r.Id, r.UserId, r.Message, r.Status, r.RequestedAt))
            .ToListAsync();
        return Ok(requests);
    }

    [Authorize]
    [HttpPut("{requestId}")]
    public async Task<IActionResult> UpdateStatus(int eventId, int requestId, UpdateRequestStatusBody body)
    {
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (ev.HostId != userId) return Forbid();

        var req = await _db.EventRequests.FindAsync(requestId);
        if (req is null) return NotFound();
        req.Status = body.Status;
        await _db.SaveChangesAsync();

        if (body.Status == "Approved")
            await _hub.Clients.Group($"event-{eventId}").SendAsync("RequestApproved", req.UserId);

        return NoContent();
    }
}
