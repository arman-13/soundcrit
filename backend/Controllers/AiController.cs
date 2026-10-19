using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly EventSummaryService _summary;
    private readonly AppDbContext _db;

    public AiController(EventSummaryService summary, AppDbContext db)
    {
        _summary = summary;
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
