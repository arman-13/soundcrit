namespace Backend.Models;

public class Album
{
    public int Id { get; set; }

    // Owning artist. Nullable because albums predating this column may have no
    // tracks to infer an owner from; an album with a null ArtistId is treated as
    // unowned and cannot be edited by anyone (see AlbumsController).
    public string? ArtistId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime ReleasedAt { get; set; }
    public bool IsPublished { get; set; }

    // Navigation
    public ICollection<TrackAlbum> TrackAlbums { get; set; } = [];
}
