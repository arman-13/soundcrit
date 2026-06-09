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

    public TracksController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResponse<Track>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] bool? featured = null,
        [FromQuery] int? albumId = null)
    {
        var query = _db.Tracks.Where(t => t.IsPublished).AsQueryable();

        if (featured == true)
            query = query.Where(t => t.IsFeatured);

        if (albumId.HasValue)
            query = query.Where(t => t.TrackAlbums.Any(ta => ta.AlbumId == albumId.Value));

        query = query.OrderByDescending(t => t.PublishedAt);
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
        var track = await _db.Tracks.FindAsync(id);
        if (track is null) return NotFound();
        track.PlayCount++;
        await _db.SaveChangesAsync();
        return Ok(new { playCount = track.PlayCount });
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Track>> Create(Track track)
    {
        _db.Tracks.Add(track);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = track.Id }, track);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Track track)
    {
        if (id != track.Id) return BadRequest();
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
        _db.Tracks.Remove(track);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
