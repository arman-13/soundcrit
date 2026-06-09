using Backend.Models;

namespace Backend.DTOs;

public record AlbumWithTracksDto(
    int Id,
    string Title,
    string CoverImageUrl,
    string? Description,
    DateTime ReleasedAt,
    bool IsPublished,
    IEnumerable<AlbumTrackDto> Tracks
);

public record AlbumTrackDto(
    int TrackId,
    int TrackNumber,
    string Title,
    string Artist,
    string Duration,
    string CoverImageUrl,
    string AudioUrl,
    string? Mood,
    int PlayCount
);

public record AddTrackToAlbumRequest(int TrackId, int TrackNumber);
