namespace Backend.Models;

public class Event
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public DateTime ScheduledAt { get; set; }
    public string Status { get; set; } = "Upcoming"; // Upcoming, Live, Ended
    public string HostId { get; set; } = string.Empty;
    public int CurrentTrackIndex { get; set; } = 0;
    public DateTime? CurrentTrackStartedAt { get; set; }
    public DateTime? CountdownStartedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<EventTrack> EventTracks { get; set; } = [];
    public ICollection<EventRequest> EventRequests { get; set; } = [];
}
