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
public class AlbumsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AlbumsController(AppDbContext db) => _db = db;

    // Every mutating endpoint here previously had [Authorize] and no ownership
    // check, so any signed-in user could edit or delete anyone's album and
    // rearrange its tracks. An album with a null ArtistId is unowned (see the
    // AddAlbumArtistId migration) and is not editable by anyone.
    private bool OwnsAlbum(Album album) =>
        album.ArtistId is not null &&
        album.ArtistId == User.FindFirstValue(ClaimTypes.NameIdentifier);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AlbumSummaryDto>>> GetAll(
        [FromQuery] string? artist = null,
        [FromQuery] bool mine = false,
        [FromQuery] string? search = null)
    {
        IQueryable<Album> query;
        if (mine)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();
            // Now keyed on the album's own owner rather than inferred from its
            // tracks. That also fixes a real bug: an album you had created but
            // not yet added any track to matched nothing and vanished from your
            // studio listing.
            query = _db.Albums.Where(a => a.ArtistId == userId);
        }
        else
        {
            query = _db.Albums.Where(a => a.IsPublished);
            if (artist is not null)
                query = query.Where(a => a.ArtistId == artist);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(a => a.Title.ToLower().Contains(s));
        }

        var albums = await query
            .OrderByDescending(a => a.ReleasedAt)
            .Select(a => new AlbumSummaryDto(
                a.Id, a.Title, a.CoverImageUrl, a.Description,
                a.ReleasedAt, a.IsPublished,
                a.TrackAlbums.Count))
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
    public async Task<ActionResult> Create(Album album)
    {
        // Ownership is taken from the caller, never from the request body.
        album.ArtistId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        album.TrackAlbums = [];
        album.ReleasedAt = DateTime.SpecifyKind(album.ReleasedAt, DateTimeKind.Utc);
        _db.Albums.Add(album);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = album.Id }, new { album.Id });
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Album album)
    {
        if (id != album.Id) return BadRequest();

        var existing = await _db.Albums.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (existing is null) return NotFound();
        if (!OwnsAlbum(existing)) return Forbid();

        // Preserve the stored owner so a client payload can't reassign the album.
        album.ArtistId = existing.ArtistId;
        album.ReleasedAt = DateTime.SpecifyKind(album.ReleasedAt, DateTimeKind.Utc);
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
        if (!OwnsAlbum(album)) return Forbid();

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
        if (!OwnsAlbum(album)) return Forbid();

        var track = await _db.Tracks.FindAsync(req.TrackId);
        if (track is null) return NotFound("Track not found");
        // You can only put your own track into an album, otherwise anyone could
        // attach another artist's work to a release.
        if (track.ArtistId != User.FindFirstValue(ClaimTypes.NameIdentifier)) return Forbid();

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
        var album = await _db.Albums.FindAsync(id);
        if (album is null) return NotFound();
        if (!OwnsAlbum(album)) return Forbid();

        var ta = await _db.TrackAlbums.FindAsync(trackId, id);
        if (ta is null) return NotFound();
        _db.TrackAlbums.Remove(ta);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpPut("{id}/tracks/reorder")]
    public async Task<IActionResult> ReorderTracks(int id, List<ReorderAlbumTrackItem> items)
    {
        var album = await _db.Albums.FindAsync(id);
        if (album is null) return NotFound();
        if (!OwnsAlbum(album)) return Forbid();

        var albumTracks = await _db.TrackAlbums.Where(ta => ta.AlbumId == id).ToListAsync();
        foreach (var item in items)
        {
            var ta = albumTracks.FirstOrDefault(t => t.TrackId == item.TrackId);
            if (ta is not null) ta.TrackNumber = item.TrackNumber;
        }
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
