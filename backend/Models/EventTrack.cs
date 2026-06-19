namespace Backend.Models;

public class EventTrack
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public int TrackId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool UploadToProfile { get; set; } = false;
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public Event Event { get; set; } = null!;
    public Track Track { get; set; } = null!;
}
