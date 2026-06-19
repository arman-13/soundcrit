using System.Security.Claims;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/users/{userId}/follow")]
public class FollowController : ControllerBase
{
    private readonly AppDbContext _db;

    public FollowController(AppDbContext db) => _db = db;

    [HttpGet("/api/users/{userId}/followers")]
    public async Task<ActionResult> GetFollowers(string userId)
    {
        var count = await _db.Follows.CountAsync(f => f.FolloweeId == userId);
        var followerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isFollowing = followerId != null && await _db.Follows.AnyAsync(f => f.FollowerId == followerId && f.FolloweeId == userId);
        return Ok(new { count, isFollowing });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Follow(string userId)
    {
        var followerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        if (followerId == userId) return BadRequest("Cannot follow yourself.");
        var exists = await _db.Follows.AnyAsync(f => f.FollowerId == followerId && f.FolloweeId == userId);
        if (exists) return Conflict();
        _db.Follows.Add(new Follow { FollowerId = followerId, FolloweeId = userId, CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [Authorize]
    [HttpDelete]
    public async Task<IActionResult> Unfollow(string userId)
    {
        var followerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var follow = await _db.Follows.FindAsync(followerId, userId);
        if (follow is null) return NotFound();
        _db.Follows.Remove(follow);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
