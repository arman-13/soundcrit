namespace Backend.Models;

public class EventRequest
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    public Event Event { get; set; } = null!;
}
