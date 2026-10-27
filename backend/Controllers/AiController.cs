using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers;

[ApiController]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly EventSummaryService _summary;
    private readonly ArtistRecapService _recap;
    private readonly AppDbContext _db;

    public AiController(EventSummaryService summary, ArtistRecapService recap, AppDbContext db)
    {
        _summary = summary;
        _recap = recap;
        _db = db;
    }

    // Returns cached summary + staleness info — no LLM call
    [HttpGet("event-summary/{eventId}")]
    public async Task<IActionResult> GetEventSummary(int eventId)
    {
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();

        var hasNewComments = ev.LastCommentAt.HasValue
            && (!ev.AiSummaryGeneratedAt.HasValue || ev.LastCommentAt > ev.AiSummaryGeneratedAt);

        return Ok(new
        {
            summary            = ev.AiSummary,
            generatedAt        = ev.AiSummaryGeneratedAt,
            hasNewComments,
        });
    }

    // Artist recap — personalized summary of comments on the artist's tracks across recent sessions
    [Authorize]
    [HttpGet("artist-recap")]
    public async Task<IActionResult> GetArtistRecap()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var result = await _recap.GenerateRecapAsync(userId);
        return Ok(new
        {
            recap    = result.Combined,
            sessions = result.Sessions.Select(s => new
            {
                eventId    = s.EventId,
                title      = s.Title,
                trackRecap = s.TrackRecap,
            }),
        });
    }

    // Triggers a fresh LLM generation — host only
    [Authorize]
    [HttpPost("event-summary/{eventId}/regenerate")]
    public async Task<IActionResult> RegenerateEventSummary(int eventId)
    {
        var ev = await _db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        if (ev.Status != "Ended") return BadRequest(new { error = "Summary only available for ended sessions." });

        var summary = await _summary.SummarizeEventAsync(eventId);
        return Ok(new { summary });
    }
}
