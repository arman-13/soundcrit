namespace Backend.Models;

public class EventComment
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public int EventTrackId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int TrackTimestamp { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsAnonymous { get; set; } = false;

    public Event Event { get; set; } = null!;
    public EventTrack EventTrack { get; set; } = null!;
}
