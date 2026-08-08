using Backend.Models;

namespace Backend.DTOs;

public record AlbumSummaryDto(
    int Id,
    string Title,
    string CoverImageUrl,
    string? Description,
    DateTime ReleasedAt,
    bool IsPublished,
    int TrackCount
);

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

public record ReorderAlbumTrackItem(int TrackId, int TrackNumber);
