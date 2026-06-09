using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlbumsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AlbumsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Album>>> GetAll()
    {
        var albums = await _db.Albums
            .Where(a => a.IsPublished)
            .OrderByDescending(a => a.ReleasedAt)
            .ToListAsync();
        return Ok(albums);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AlbumWithTracksDto>> GetById(int id)
    {
        var album = await _db.Albums
            .Include(a => a.TrackAlbums)
                .ThenInclude(ta => ta.Track)
            .FirstOrDefaultAsync(a => a.Id == id && a.IsPublished);

        if (album is null) return NotFound();

        var dto = new AlbumWithTracksDto(
            Id: album.Id,
            Title: album.Title,
            CoverImageUrl: album.CoverImageUrl,
            Description: album.Description,
            ReleasedAt: album.ReleasedAt,
            IsPublished: album.IsPublished,
            Tracks: album.TrackAlbums
                .OrderBy(ta => ta.TrackNumber)
                .Select(ta => new AlbumTrackDto(
                    TrackId: ta.Track.Id,
                    TrackNumber: ta.TrackNumber,
                    Title: ta.Track.Title,
                    Artist: ta.Track.Artist,
                    Duration: ta.Track.Duration,
                    CoverImageUrl: ta.Track.CoverImageUrl,
                    AudioUrl: ta.Track.AudioUrl,
                    Mood: ta.Track.Mood,
                    PlayCount: ta.Track.PlayCount
                ))
        );

        return Ok(dto);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Album>> Create(Album album)
    {
        _db.Albums.Add(album);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = album.Id }, album);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Album album)
    {
        if (id != album.Id) return BadRequest();
        _db.Entry(album).State = EntityState.Modified;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var album = await _db.Albums.FindAsync(id);
        if (album is null) return NotFound();
        _db.Albums.Remove(album);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpPost("{id}/tracks")]
    public async Task<IActionResult> AddTrack(int id, AddTrackToAlbumRequest req)
    {
        var album = await _db.Albums.FindAsync(id);
        if (album is null) return NotFound("Album not found");

        var track = await _db.Tracks.FindAsync(req.TrackId);
        if (track is null) return NotFound("Track not found");

        var exists = await _db.TrackAlbums.AnyAsync(ta => ta.AlbumId == id && ta.TrackId == req.TrackId);
        if (exists) return Conflict("Track already in album");

        _db.TrackAlbums.Add(new TrackAlbum { AlbumId = id, TrackId = req.TrackId, TrackNumber = req.TrackNumber });
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}/tracks/{trackId}")]
    public async Task<IActionResult> RemoveTrack(int id, int trackId)
    {
        var ta = await _db.TrackAlbums.FindAsync(trackId, id);
        if (ta is null) return NotFound();
        _db.TrackAlbums.Remove(ta);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
