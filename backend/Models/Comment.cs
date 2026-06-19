namespace Backend.Models;

public class Comment
{
    public int Id { get; set; }
    public int TrackId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public double? SongTimestamp { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Track Track { get; set; } = null!;
}
