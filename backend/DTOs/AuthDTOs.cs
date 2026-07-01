namespace Backend.DTOs;

public record RegisterRequest(
    string Email,
    string Username,
    string DisplayName,
    string Password
);

public record LoginRequest(
    string Email,
    string Password
);

public record UpdateProfileRequest(
    string DisplayName,
    string? Bio,
    string? AvatarUrl
);

public record AuthResponse(
    string Token,
    UserDto User
);

public record UserDto(
    string Id,
    string Email,
    string Username,
    string DisplayName,
    string? AvatarUrl,
    string? Bio,
    DateTime CreatedAt
);

public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);
public record VerifyEmailRequest(string Email, string Token);

public record PublicUserDto(
    string Id,
    string Username,
    string DisplayName,
    string? AvatarUrl,
    string? Bio
);
