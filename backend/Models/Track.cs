namespace Backend.Models;

public class Track
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AlbumTitle { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public string AudioUrl { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }
    public bool IsPublished { get; set; }

    // New fields
    public int PlayCount { get; set; } = 0;
    public bool IsFeatured { get; set; } = false;
    public string? Description { get; set; }
    public string? Story { get; set; }
    public string? Mood { get; set; }

    // Navigation
    public ICollection<TrackAlbum> TrackAlbums { get; set; } = [];
}
