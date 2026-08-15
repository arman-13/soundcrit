using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TracksController : ControllerBase
{
    private readonly AppDbContext _db;

    // Caller-supplied paging is clamped: an unbounded pageSize let a single
    // request pull the entire catalogue into memory.
    private const int MaxPageSize = 100;

    public TracksController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResponse<Track>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] bool? featured = null,
        [FromQuery] int? albumId = null,
        [FromQuery] bool all = false,
        [FromQuery] string? artist = null,
        [FromQuery] string? search = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _db.Tracks.AsQueryable();
        if (all)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();
            query = query.Where(t => t.ArtistId == userId);
        }
        else
        {
            query = query.Where(t => t.IsPublished);
            if (artist is not null)
                query = query.Where(t => t.ArtistId == artist);
        }

        if (featured == true)
            query = query.Where(t => t.IsFeatured);

        if (albumId.HasValue)
            query = query.Where(t => t.TrackAlbums.Any(ta => ta.AlbumId == albumId.Value));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(s) || t.Artist.ToLower().Contains(s));
        }

        query = query.OrderByDescending(t => t.PublishedAt);
        var total = await query.CountAsync();
        var data = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new PagedResponse<Track> { Data = data, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [Authorize]
    [HttpGet("following")]
    public async Task<ActionResult<PagedResponse<Track>>> GetFollowing(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var followedIds = await _db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FolloweeId)
            .ToListAsync();

        if (followedIds.Count == 0)
            return Ok(new PagedResponse<Track> { Data = [], TotalCount = 0, Page = page, PageSize = pageSize });

        var query = _db.Tracks
            .Where(t => t.IsPublished && t.ArtistId != null && followedIds.Contains(t.ArtistId))
            .OrderByDescending(t => t.PublishedAt);

        var total = await query.CountAsync();
        var data = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new PagedResponse<Track> { Data = data, TotalCount = total, Page = page, PageSize = pageSize });
    }

    [HttpGet("charted")]
    public async Task<ActionResult<IEnumerable<Track>>> GetCharted()
    {
        var tracks = await _db.Tracks
            .Where(t => t.IsPublished)
            .OrderByDescending(t => t.PlayCount)
            .Take(10)
            .ToListAsync();
        return Ok(tracks);
    }

    [HttpGet("featured")]
    public async Task<ActionResult<IEnumerable<Track>>> GetFeatured()
    {
        var tracks = await _db.Tracks
            .Where(t => t.IsPublished && t.IsFeatured)
            .OrderByDescending(t => t.PublishedAt)
            .ToListAsync();
        return Ok(tracks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Track>> GetById(int id)
    {
        var track = await _db.Tracks.FirstOrDefaultAsync(t => t.Id == id && t.IsPublished);
        return track is null ? NotFound() : Ok(track);
    }

    [HttpPost("{id}/play")]
    public async Task<IActionResult> IncrementPlay(int id)
    {
        // Incremented in the database rather than read-modify-write: concurrent
        // listeners on the same track were each writing back a count they had
        // read before the others' increments, silently losing plays.
        var updated = await _db.Tracks
            .Where(t => t.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.PlayCount, t => t.PlayCount + 1));

        if (updated == 0) return NotFound();

        var playCount = await _db.Tracks.Where(t => t.Id == id)
            .Select(t => t.PlayCount).FirstOrDefaultAsync();
        return Ok(new { playCount });
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult> Create(Track track)
    {
        track.ArtistId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        track.TrackAlbums = [];
        _db.Tracks.Add(track);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = track.Id }, new { track.Id });
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Track track)
    {
        if (id != track.Id) return BadRequest();
        var existing = await _db.Tracks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (existing is null) return NotFound();

        // Only the owning artist may edit a track. Without this any signed-in user
        // could PUT over anyone else's track, since [Authorize] alone just proves
        // that *some* account is making the call.
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (existing.ArtistId != userId) return Forbid();

        // Server-owned fields are restored from the stored row so a client payload
        // can't reassign ownership or rewrite the play count.
        track.ArtistId = existing.ArtistId;
        track.PlayCount = existing.PlayCount;
        _db.Entry(track).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var track = await _db.Tracks.FindAsync(id);
        if (track is null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (track.ArtistId != userId) return Forbid();

        _db.Tracks.Remove(track);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
