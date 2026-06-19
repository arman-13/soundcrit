using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/events/{eventId}/comments")]
public class EventCommentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IHubContext<EventHub> _hub;

    public EventCommentsController(AppDbContext db, UserManager<ApplicationUser> userManager, IHubContext<EventHub> hub)
    {
        _db = db; _userManager = userManager; _hub = hub;
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<EventCommentDto>> Create(int eventId, CreateEventCommentBody body)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();

        var isApproved = await _db.EventRequests.AnyAsync(r =>
            r.EventId == eventId && r.UserId == userId && r.Status == "Approved");
        var isHost = ev.HostId == userId;
        if (ev.Status == "Live" && !isApproved && !isHost) return Forbid();

        var user = await _userManager.FindByIdAsync(userId);
        var displayName = body.IsAnonymous ? "Anonymous" : (user?.DisplayName ?? user?.UserName ?? "Unknown");

        var comment = new EventComment
        {
            EventId = eventId, EventTrackId = body.EventTrackId,
            UserId = userId, DisplayName = displayName,
            Content = body.Content, TrackTimestamp = body.TrackTimestamp,
            IsAnonymous = body.IsAnonymous, CreatedAt = DateTime.UtcNow
        };
        _db.EventComments.Add(comment);
        await _db.SaveChangesAsync();

        var dto = new EventCommentDto(comment.Id, comment.EventTrackId, comment.UserId,
            comment.DisplayName, comment.Content, comment.TrackTimestamp,
            comment.CreatedAt, comment.IsAnonymous);

        await _hub.Clients.Group($"event-{eventId}").SendAsync("NewComment", dto);
        return Ok(dto);
    }

    [HttpGet("{eventTrackId}")]
    public async Task<ActionResult<IEnumerable<EventCommentDto>>> GetByTrack(int eventId, int eventTrackId)
    {
        var comments = await _db.EventComments
            .Where(c => c.EventId == eventId && c.EventTrackId == eventTrackId)
            .OrderBy(c => c.TrackTimestamp)
            .Select(c => new EventCommentDto(c.Id, c.EventTrackId, c.UserId, c.DisplayName,
                c.Content, c.TrackTimestamp, c.CreatedAt, c.IsAnonymous))
            .ToListAsync();
        return Ok(comments);
    }
}
