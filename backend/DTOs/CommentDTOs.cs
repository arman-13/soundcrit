namespace Backend.DTOs;

public record CommentDto(
    int Id,
    string UserId,
    string DisplayName,
    string Content,
    double? SongTimestamp,
    DateTime CreatedAt
);

public record CreateCommentRequest(
    string Content,
    double? SongTimestamp
);
