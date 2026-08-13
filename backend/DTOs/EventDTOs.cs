namespace Backend.DTOs;

public record EventSummaryDto(
    int Id, string Title, string? Description, string? CoverImageUrl,
    DateTime ScheduledAt, string Status, string HostId,
    int TrackCount, List<string> Genres
);

public record EventDetailDto(
    int Id, string Title, string? Description, string? CoverImageUrl,
    DateTime ScheduledAt, string Status, string HostId,
    string HostDisplayName, string? HostAvatarUrl,
    int TrackCount, List<string> Genres,
    List<EventTrackDto> Tracks,
    PlaybackStateDto PlaybackState
);

public record EventTrackDto(
    int Id, int TrackId, string Title, string Artist, string Duration,
    string AudioUrl, string CoverImageUrl, string? Genre, string? Mood,
    int Order, string Status, string UserId, bool UploadToProfile,
    string? Description
);

public record PlaybackStateDto(
    string Status, int CurrentTrackIndex,
    DateTime? CurrentTrackStartedAt, DateTime? CountdownStartedAt,
    DateTime ServerTime
);

public record EventSyncDto(
    string Status, int CurrentTrackIndex,
    double ElapsedSeconds, double CountdownSeconds,
    DateTime ServerTime
);

public record HubTrackDto(
    int Index, int EventTrackId, int TrackId, string Title, string Artist,
    string AudioUrl, string CoverImageUrl, string Duration, string? Genre,
    DateTime StartedAt
);

public record CreateEventRequest(
    string Title, string? Description, string? CoverImageUrl, DateTime ScheduledAt
);

public record UpdateEventRequest(
    string Title, string? Description, string? CoverImageUrl, DateTime ScheduledAt
);

public record EventRequestDto(
    int Id, string UserId, string DisplayName, string? Username, string? AvatarUrl, string? Message, string Status, DateTime RequestedAt
);

public record SubmitJoinRequestBody(string? Message);

public record UpdateRequestStatusBody(string Status);

public record SubmitEventTrackBody(int TrackId, bool UploadToProfile);

public record UpdateEventTrackBody(string Status, int Order);

public record ReorderEventTracksBody(List<ReorderItem> Items);
public record ReorderItem(int Id, int Order);

public record SuggestedArtistDto(
    string Id, string Username, string DisplayName, string? AvatarUrl, string? Bio, int MutualFollowerCount
);

public record EventCommentDto(
    int Id, int EventTrackId, string UserId, string DisplayName,
    string Content, int TrackTimestamp, DateTime CreatedAt, bool IsAnonymous
);

public record CreateEventCommentBody(
    string Content, int EventTrackId, int TrackTimestamp, bool IsAnonymous
);
