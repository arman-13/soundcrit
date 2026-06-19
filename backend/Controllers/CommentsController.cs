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
[Route("api/tracks/{trackId}/comments")]
public class CommentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public CommentsController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetAll(int trackId)
    {
        var comments = await _db.Comments
            .Where(c => c.TrackId == trackId)
            .OrderBy(c => c.SongTimestamp == null ? 1 : 0)
            .ThenBy(c => c.SongTimestamp)
            .ThenBy(c => c.CreatedAt)
            .Select(c => new CommentDto(c.Id, c.UserId, c.DisplayName, c.Content, c.SongTimestamp, c.CreatedAt))
            .ToListAsync();
        return Ok(comments);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<CommentDto>> Create(int trackId, CreateCommentRequest req)
    {
        var track = await _db.Tracks.FindAsync(trackId);
        if (track is null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await _userManager.FindByIdAsync(userId);

        var comment = new Comment
        {
            TrackId = trackId,
            UserId = userId,
            DisplayName = user?.DisplayName ?? user?.UserName ?? "Unknown",
            Content = req.Content,
            SongTimestamp = req.SongTimestamp,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        return Ok(new CommentDto(comment.Id, comment.UserId, comment.DisplayName, comment.Content, comment.SongTimestamp, comment.CreatedAt));
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int trackId, int id)
    {
        var comment = await _db.Comments.FindAsync(id);
        if (comment is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (comment.UserId != userId) return Forbid();
        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
