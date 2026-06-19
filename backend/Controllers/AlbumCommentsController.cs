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
[Route("api/albums/{albumId}/comments")]
public class AlbumCommentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public AlbumCommentsController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetAll(int albumId)
    {
        var comments = await _db.AlbumComments
            .Where(c => c.AlbumId == albumId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto(c.Id, c.UserId, c.DisplayName, c.Content, null, c.CreatedAt))
            .ToListAsync();
        return Ok(comments);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<CommentDto>> Create(int albumId, CreateCommentRequest req)
    {
        var album = await _db.Albums.FindAsync(albumId);
        if (album is null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await _userManager.FindByIdAsync(userId);

        var comment = new AlbumComment
        {
            AlbumId = albumId,
            UserId = userId,
            DisplayName = user?.DisplayName ?? user?.UserName ?? "Unknown",
            Content = req.Content,
            CreatedAt = DateTime.UtcNow,
        };

        _db.AlbumComments.Add(comment);
        await _db.SaveChangesAsync();

        return Ok(new CommentDto(comment.Id, comment.UserId, comment.DisplayName, comment.Content, null, comment.CreatedAt));
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int albumId, int id)
    {
        var comment = await _db.AlbumComments.FindAsync(id);
        if (comment is null) return NotFound();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (comment.UserId != userId) return Forbid();
        _db.AlbumComments.Remove(comment);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
