namespace Backend.Models;

public class TrackAlbum
{
    public int TrackId { get; set; }
    public Track Track { get; set; } = null!;

    public int AlbumId { get; set; }
    public Album Album { get; set; } = null!;

    public int TrackNumber { get; set; }
}
