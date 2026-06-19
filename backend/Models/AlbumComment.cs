namespace Backend.Models;

public class AlbumComment
{
    public int Id { get; set; }
    public int AlbumId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Album Album { get; set; } = null!;
}
