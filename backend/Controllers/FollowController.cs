using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
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

    [HttpGet("/api/artists/suggested")]
    public async Task<ActionResult<IEnumerable<SuggestedArtistDto>>> GetSuggestedArtists([FromQuery] int take = 10)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var personalized = userId is null ? [] : await GetPersonalizedSuggestions(userId, take);
        if (personalized.Count > 0) return Ok(personalized);

        // Fallback: no follow graph to work with (logged out, or too new to have peers) —
        // surface artists with recently published work instead, excluding the current user.
        var recentArtistIds = await _db.Tracks
            .Where(t => t.IsPublished && t.ArtistId != null && t.ArtistId != userId)
            .GroupBy(t => t.ArtistId)
            .OrderByDescending(g => g.Max(t => t.PublishedAt))
            .Select(g => g.Key!)
            .Take(take)
            .ToListAsync();

        var recentUsers = await _db.Users
            .Where(u => recentArtistIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var fallback = recentArtistIds
            .Where(recentUsers.ContainsKey)
            .Select(id => new SuggestedArtistDto(
                recentUsers[id].Id, recentUsers[id].UserName!, recentUsers[id].DisplayName,
                recentUsers[id].AvatarUrl, recentUsers[id].Bio, 0
            ))
            .ToList();

        return Ok(fallback);
    }

    private async Task<List<SuggestedArtistDto>> GetPersonalizedSuggestions(string userId, int take)
    {
        var myFollows = await _db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FolloweeId)
            .ToListAsync();

        if (myFollows.Count == 0) return [];

        // People who also follow at least one artist I follow — my "peers"
        var peerIds = await _db.Follows
            .Where(f => myFollows.Contains(f.FolloweeId) && f.FollowerId != userId)
            .Select(f => f.FollowerId)
            .Distinct()
            .ToListAsync();

        if (peerIds.Count == 0) return [];

        // Artists my peers follow that I don't already follow — ranked by how many peers follow them
        var ranked = await _db.Follows
            .Where(f => peerIds.Contains(f.FollowerId) && f.FolloweeId != userId && !myFollows.Contains(f.FolloweeId))
            .GroupBy(f => f.FolloweeId)
            .Select(g => new { UserId = g.Key, MutualCount = g.Count() })
            .OrderByDescending(x => x.MutualCount)
            .Take(take)
            .ToListAsync();

        var candidateIds = ranked.Select(r => r.UserId).ToList();
        var artistIds = await _db.Tracks
            .Where(t => t.IsPublished && t.ArtistId != null && candidateIds.Contains(t.ArtistId))
            .Select(t => t.ArtistId!)
            .Distinct()
            .ToListAsync();

        var users = await _db.Users
            .Where(u => artistIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        return ranked
            .Where(r => users.ContainsKey(r.UserId))
            .Select(r => new SuggestedArtistDto(
                users[r.UserId].Id, users[r.UserId].UserName!, users[r.UserId].DisplayName,
                users[r.UserId].AvatarUrl, users[r.UserId].Bio, r.MutualCount
            ))
            .ToList();
    }

    [HttpGet("/api/users/{userId}/followers")]
    public async Task<ActionResult> GetFollowers(string userId)
    {
        var count = await _db.Follows.CountAsync(f => f.FolloweeId == userId);
        var followerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isFollowing = followerId != null && await _db.Follows.AnyAsync(f => f.FollowerId == followerId && f.FolloweeId == userId);
        return Ok(new { count, isFollowing });
    }

    [HttpGet("/api/users/{userId}/following")]
    public async Task<ActionResult<IEnumerable<PublicUserDto>>> GetFollowing(string userId)
    {
        var followeeIds = await _db.Follows
            .Where(f => f.FollowerId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => f.FolloweeId)
            .ToListAsync();

        var users = await _db.Users.Where(u => followeeIds.Contains(u.Id)).ToListAsync();
        var byId = users.ToDictionary(u => u.Id);

        var ordered = followeeIds
            .Where(id => byId.ContainsKey(id))
            .Select(id => byId[id])
            .Select(u => new PublicUserDto(u.Id, u.UserName!, u.DisplayName, u.AvatarUrl, u.Bio));

        return Ok(ordered);
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
