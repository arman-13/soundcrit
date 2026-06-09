namespace Backend.Models;

public class Album
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime ReleasedAt { get; set; }
    public bool IsPublished { get; set; }

    // Navigation
    public ICollection<TrackAlbum> TrackAlbums { get; set; } = [];
}
